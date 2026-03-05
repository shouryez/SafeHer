from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError
import asyncio
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ── Pydantic Models ──

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    created_at: str

class TrustedContactCreate(BaseModel):
    name: str
    phone: str
    priority: int = 1

class TrustedContactOut(BaseModel):
    id: str
    user_id: str
    name: str
    phone: str
    priority: int

class TripStart(BaseModel):
    mode: str  # cab, transport, walk
    origin_name: str
    origin_lat: float
    origin_lng: float
    destination_name: str
    destination_lat: float
    destination_lng: float
    vehicle_number: Optional[str] = None

class TripUpdate(BaseModel):
    lat: float
    lng: float
    speed: Optional[float] = 0.0

class TripEnd(BaseModel):
    safety_rating: Optional[int] = None

class TripOut(BaseModel):
    id: str
    user_id: str
    mode: str
    origin_name: str
    destination_name: str
    start_time: str
    end_time: Optional[str] = None
    safety_rating: Optional[int] = None
    status: str
    vehicle_number: Optional[str] = None

class ReportCreate(BaseModel):
    trip_id: Optional[str] = None
    incident_type: str
    description: str
    lat: float
    lng: float

class ReportOut(BaseModel):
    id: str
    user_id: str
    trip_id: Optional[str] = None
    incident_type: str
    description: str
    lat: float
    lng: float
    timestamp: str

class SafetyScoreOut(BaseModel):
    id: str
    route_id: str
    area_name: str
    score: float
    lighting_score: float
    crowd_score: float
    cctv_available: bool
    time_of_day: str
    last_updated: str

class AlertCreate(BaseModel):
    trip_id: Optional[str] = None
    alert_type: str  # sos, suspicious, route_deviation, unusual_stop

class AlertOut(BaseModel):
    id: str
    user_id: str
    trip_id: Optional[str] = None
    alert_type: str
    triggered_at: str
    contacts_notified: List[str]

class RouteAnalysisRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    time_of_day: str
    mode: str  # walk, cab, transport

class RouteOption(BaseModel):
    id: str
    label: str
    duration_min: int
    safety_score: int
    recommended: bool
    description: str
    warnings: List[str]
    crowd_density: Optional[dict] = None
    lighting: Optional[dict] = None

class RouteAnalysisResponse(BaseModel):
    routes: List[RouteOption]
    area_analysis: Optional[dict] = None

# ── Auth Helpers ──

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ── Auth Routes ──

@api_router.post("/auth/register")
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "email": data.email,
        "phone": data.phone or "",
        "password_hash": pwd_context.hash(data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    token = create_token(user["id"])
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "phone": user["phone"]}}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not pwd_context.verify(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"])
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "phone": user.get("phone", "")}}

@api_router.get("/auth/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    return UserProfile(id=user["id"], name=user["name"], email=user["email"], phone=user.get("phone"), created_at=user["created_at"])

# ── Trusted Contacts ──

@api_router.post("/contacts", response_model=TrustedContactOut)
async def add_contact(data: TrustedContactCreate, user: dict = Depends(get_current_user)):
    count = await db.trusted_contacts.count_documents({"user_id": user["id"]})
    if count >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 trusted contacts allowed")
    contact = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": data.name,
        "phone": data.phone,
        "priority": data.priority
    }
    await db.trusted_contacts.insert_one(contact)
    return TrustedContactOut(**{k: v for k, v in contact.items() if k != "_id"})

@api_router.get("/contacts", response_model=List[TrustedContactOut])
async def get_contacts(user: dict = Depends(get_current_user)):
    contacts = await db.trusted_contacts.find({"user_id": user["id"]}, {"_id": 0}).sort("priority", 1).to_list(10)
    return [TrustedContactOut(**c) for c in contacts]

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, user: dict = Depends(get_current_user)):
    result = await db.trusted_contacts.delete_one({"id": contact_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"status": "deleted"}

# ── Trips ──

@api_router.post("/trips/start", response_model=TripOut)
async def start_trip(data: TripStart, user: dict = Depends(get_current_user)):
    trip = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "mode": data.mode,
        "origin_name": data.origin_name,
        "origin_lat": data.origin_lat,
        "origin_lng": data.origin_lng,
        "destination_name": data.destination_name,
        "destination_lat": data.destination_lat,
        "destination_lng": data.destination_lng,
        "start_time": datetime.now(timezone.utc).isoformat(),
        "end_time": None,
        "safety_rating": None,
        "status": "active",
        "vehicle_number": data.vehicle_number
    }
    await db.trips.insert_one(trip)
    return TripOut(**{k: v for k, v in trip.items() if k not in ("_id", "origin_lat", "origin_lng", "destination_lat", "destination_lng")})

@api_router.post("/trips/{trip_id}/location")
async def update_trip_location(trip_id: str, data: TripUpdate, user: dict = Depends(get_current_user)):
    trip = await db.trips.find_one({"id": trip_id, "user_id": user["id"]}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    loc = {
        "id": str(uuid.uuid4()),
        "trip_id": trip_id,
        "lat": data.lat,
        "lng": data.lng,
        "speed": data.speed or 0.0,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.location_trail.insert_one(loc)
    return {"status": "recorded"}

@api_router.post("/trips/{trip_id}/end", response_model=TripOut)
async def end_trip(trip_id: str, data: TripEnd, user: dict = Depends(get_current_user)):
    trip = await db.trips.find_one({"id": trip_id, "user_id": user["id"]}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    update = {
        "end_time": datetime.now(timezone.utc).isoformat(),
        "status": "completed",
        "safety_rating": data.safety_rating
    }
    await db.trips.update_one({"id": trip_id}, {"$set": update})
    trip.update(update)
    return TripOut(**{k: v for k, v in trip.items() if k not in ("_id", "origin_lat", "origin_lng", "destination_lat", "destination_lng")})

@api_router.get("/trips", response_model=List[TripOut])
async def get_trips(user: dict = Depends(get_current_user)):
    trips = await db.trips.find({"user_id": user["id"]}, {"_id": 0}).sort("start_time", -1).to_list(50)
    return [TripOut(**{k: v for k, v in t.items() if k not in ("origin_lat", "origin_lng", "destination_lat", "destination_lng")}) for t in trips]

@api_router.get("/trips/active")
async def get_active_trip(user: dict = Depends(get_current_user)):
    trip = await db.trips.find_one({"user_id": user["id"], "status": "active"}, {"_id": 0})
    if not trip:
        return {"active_trip": None}
    return {"active_trip": {k: v for k, v in trip.items() if k != "_id"}}

# ── Reports ──

@api_router.post("/reports", response_model=ReportOut)
async def create_report(data: ReportCreate, user: dict = Depends(get_current_user)):
    report = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "trip_id": data.trip_id,
        "incident_type": data.incident_type,
        "description": data.description,
        "lat": data.lat,
        "lng": data.lng,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.reports.insert_one(report)
    return ReportOut(**{k: v for k, v in report.items() if k != "_id"})

@api_router.get("/reports", response_model=List[ReportOut])
async def get_reports(user: dict = Depends(get_current_user)):
    reports = await db.reports.find({"user_id": user["id"]}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    return [ReportOut(**r) for r in reports]

# ── Safety Scores ──

@api_router.get("/safety-scores")
async def get_safety_scores(area: Optional[str] = None, route_id: Optional[str] = None):
    query = {}
    if area:
        query["area_name"] = {"$regex": area, "$options": "i"}
    if route_id:
        query["route_id"] = route_id
    scores = await db.safety_scores.find(query, {"_id": 0}).to_list(100)
    return scores

@api_router.get("/safety-scores/transport")
async def get_transport_safety():
    scores = await db.safety_scores.find({"route_type": "transport"}, {"_id": 0}).to_list(100)
    return scores

# ── Alerts / SOS ──

@api_router.post("/alerts/sos", response_model=AlertOut)
async def trigger_sos(data: AlertCreate, user: dict = Depends(get_current_user)):
    contacts = await db.trusted_contacts.find({"user_id": user["id"]}, {"_id": 0}).to_list(3)
    contact_names = [c["name"] for c in contacts]
    alert = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "trip_id": data.trip_id,
        "alert_type": data.alert_type,
        "triggered_at": datetime.now(timezone.utc).isoformat(),
        "contacts_notified": contact_names,
        "status": "active"
    }
    await db.alerts.insert_one(alert)
    # MOCKED: In production, Twilio SMS would be sent here
    logger.info(f"SOS ALERT triggered by user {user['name']}. Contacts notified: {contact_names}")
    return AlertOut(**{k: v for k, v in alert.items() if k not in ("_id", "status")})

@api_router.get("/alerts", response_model=List[AlertOut])
async def get_alerts(user: dict = Depends(get_current_user)):
    alerts = await db.alerts.find({"user_id": user["id"]}, {"_id": 0}).sort("triggered_at", -1).to_list(50)
    return [AlertOut(**{k: v for k, v in a.items() if k not in ("status",)}) for a in alerts]

# ── Overpass API Helpers (OpenStreetMap) ──

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

async def query_crowd_density(lat: float, lng: float, radius: int = 500) -> dict:
    """Query OpenStreetMap for POIs that indicate crowd density and business activity."""
    query = f"""
    [out:json][timeout:10];
    (
      node["amenity"~"restaurant|cafe|bar|fast_food|pub|food_court|ice_cream"](around:{radius},{lat},{lng});
      node["shop"](around:{radius},{lat},{lng});
      node["amenity"~"bank|atm|pharmacy|hospital|clinic|police"](around:{radius},{lat},{lng});
      node["amenity"~"bus_station|taxi"](around:{radius},{lat},{lng});
      node["public_transport"="station"](around:{radius},{lat},{lng});
      node["public_transport"="stop_position"](around:{radius},{lat},{lng});
      node["office"](around:{radius},{lat},{lng});
      node["tourism"~"hotel|hostel|guest_house|museum|attraction"](around:{radius},{lat},{lng});
    );
    out count;
    """
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(OVERPASS_URL, data={"data": query})
            data = resp.json()
            total_pois = data.get("elements", [{}])[0].get("tags", {}).get("total", 0) if data.get("elements") else 0
            total_pois = int(total_pois)

            # Score: 0-10 based on POI density
            # 0-5 POIs = very low (1-2), 5-15 = low (3-4), 15-40 = moderate (5-6),
            # 40-80 = good (7-8), 80+ = high (9-10)
            if total_pois >= 80: score = 10
            elif total_pois >= 60: score = 9
            elif total_pois >= 40: score = 8
            elif total_pois >= 25: score = 7
            elif total_pois >= 15: score = 6
            elif total_pois >= 10: score = 5
            elif total_pois >= 5: score = 4
            elif total_pois >= 2: score = 3
            else: score = 1

            if score >= 7: level = "High"
            elif score >= 5: level = "Moderate"
            elif score >= 3: level = "Low"
            else: level = "Very Low"

            return {
                "score": score,
                "total_pois": total_pois,
                "level": level,
                "radius_m": radius,
                "description": f"{total_pois} businesses/transit stops within {radius}m"
            }
    except Exception as e:
        logger.warning(f"Overpass crowd query failed: {e}")
        return {"score": 5, "total_pois": -1, "level": "Unknown", "radius_m": radius, "description": "Could not fetch crowd data"}


async def query_lighting_conditions(lat: float, lng: float, radius: int = 500) -> dict:
    """Query OpenStreetMap for street lamps, lit roads, and lighting infrastructure."""
    query = f"""
    [out:json][timeout:10];
    (
      node["highway"="street_lamp"](around:{radius},{lat},{lng});
      way["lit"="yes"](around:{radius},{lat},{lng});
      way["highway"~"primary|secondary|tertiary|residential|footway|pedestrian"]["lit"="yes"](around:{radius},{lat},{lng});
      node["amenity"="lighting"](around:{radius},{lat},{lng});
    );
    out count;
    """
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(OVERPASS_URL, data={"data": query})
            data = resp.json()
            total_lights = data.get("elements", [{}])[0].get("tags", {}).get("total", 0) if data.get("elements") else 0
            total_lights = int(total_lights)

            # Score: 0-10
            if total_lights >= 50: score = 10
            elif total_lights >= 35: score = 9
            elif total_lights >= 25: score = 8
            elif total_lights >= 18: score = 7
            elif total_lights >= 12: score = 6
            elif total_lights >= 7: score = 5
            elif total_lights >= 4: score = 4
            elif total_lights >= 2: score = 3
            else: score = 1

            if score >= 7: level = "Well-Lit"
            elif score >= 5: level = "Moderate"
            elif score >= 3: level = "Poorly Lit"
            else: level = "Dark"

            return {
                "score": score,
                "total_lights": total_lights,
                "level": level,
                "radius_m": radius,
                "description": f"{total_lights} street lamps & lit roads within {radius}m"
            }
    except Exception as e:
        logger.warning(f"Overpass lighting query failed: {e}")
        return {"score": 5, "total_lights": -1, "level": "Unknown", "radius_m": radius, "description": "Could not fetch lighting data"}


# ── Area Analysis Endpoint ──

@api_router.get("/safety/area-analysis")
async def area_analysis(lat: float, lng: float, radius: int = 500):
    """Get crowd density and lighting analysis for a specific coordinate."""
    crowd, lighting = await asyncio.gather(
        query_crowd_density(lat, lng, radius),
        query_lighting_conditions(lat, lng, radius),
    )
    overall = round((crowd["score"] + lighting["score"]) / 2, 1)
    return {
        "lat": lat, "lng": lng, "radius_m": radius,
        "crowd_density": crowd,
        "lighting": lighting,
        "overall_safety_score": overall,
        "data_source": "OpenStreetMap Overpass API (real-time)"
    }

# ── AI Route Analysis (Gemini + Overpass) ──

@api_router.post("/ai/analyze-route", response_model=RouteAnalysisResponse)
async def analyze_route(data: RouteAnalysisRequest, user: dict = Depends(get_current_user)):
    # Step 1: Fetch real crowd density and lighting data from Overpass API
    mid_lat = (data.origin_lat + data.destination_lat) / 2
    mid_lng = (data.origin_lng + data.destination_lng) / 2

    # Query 3 points along route: origin area, midpoint, destination area
    origin_crowd, origin_light, mid_crowd, mid_light, dest_crowd, dest_light = await asyncio.gather(
        query_crowd_density(data.origin_lat, data.origin_lng, 400),
        query_lighting_conditions(data.origin_lat, data.origin_lng, 400),
        query_crowd_density(mid_lat, mid_lng, 400),
        query_lighting_conditions(mid_lat, mid_lng, 400),
        query_crowd_density(data.destination_lat, data.destination_lng, 400),
        query_lighting_conditions(data.destination_lat, data.destination_lng, 400),
    )

    area_analysis_data = {
        "origin": {"crowd": origin_crowd, "lighting": origin_light},
        "midpoint": {"crowd": mid_crowd, "lighting": mid_light},
        "destination": {"crowd": dest_crowd, "lighting": dest_light},
        "avg_crowd_score": round((origin_crowd["score"] + mid_crowd["score"] + dest_crowd["score"]) / 3, 1),
        "avg_lighting_score": round((origin_light["score"] + mid_light["score"] + dest_light["score"]) / 3, 1),
        "data_source": "OpenStreetMap Overpass API (real-time)"
    }

    # Step 2: Use Gemini AI with real data to generate scored routes
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import json

        reports = await db.reports.find({}, {"_id": 0}).to_list(100)
        report_summary = f"{len(reports)} incident reports in database."
        if reports:
            types = {}
            for r in reports:
                t = r.get("incident_type", "unknown")
                types[t] = types.get(t, 0) + 1
            report_summary += f" Types: {types}"

        prompt = f"""You are a women's safety route analyst. Analyze safety for a {data.mode} trip.

Origin: ({data.origin_lat}, {data.origin_lng})
Destination: ({data.destination_lat}, {data.destination_lng})
Time: {data.time_of_day}
Mode: {data.mode}

REAL MEASURED DATA from OpenStreetMap:
- Origin area: Crowd density {origin_crowd['score']}/10 ({origin_crowd['total_pois']} POIs), Lighting {origin_light['score']}/10 ({origin_light['total_lights']} lamps/lit roads)
- Midpoint area: Crowd density {mid_crowd['score']}/10 ({mid_crowd['total_pois']} POIs), Lighting {mid_light['score']}/10 ({mid_light['total_lights']} lamps/lit roads)
- Destination area: Crowd density {dest_crowd['score']}/10 ({dest_crowd['total_pois']} POIs), Lighting {dest_light['score']}/10 ({dest_light['total_lights']} lamps/lit roads)
- Average crowd density: {area_analysis_data['avg_crowd_score']}/10
- Average lighting: {area_analysis_data['avg_lighting_score']}/10

Safety reports: {report_summary}

Using the REAL measured data above, generate 3 route options. Each route should have:
- A realistic safety_score (0-100) heavily influenced by the real crowd and lighting data
- crowd_density and lighting objects with score (0-10), level, and description based on the real data
- The "Safest" route should favor areas with higher crowd density and lighting scores
- The "Fastest" route may go through less populated / dimmer areas
- Include specific warnings based on the real data (e.g. "Low lighting: only X street lamps detected")

Return ONLY valid JSON (no markdown, no code blocks):
{{"routes": [
  {{"id": "route_1", "label": "Fastest", "duration_min": 12, "safety_score": 45, "recommended": false, "description": "Direct route - some dark stretches", "warnings": ["Low lighting in midpoint area"], "crowd_density": {{"score": 4, "level": "Low", "total_pois": 8, "description": "8 businesses nearby"}}, "lighting": {{"score": 3, "level": "Poorly Lit", "total_lights": 5, "description": "5 street lamps detected"}}}},
  {{"id": "route_2", "label": "Safest", "duration_min": 18, "safety_score": 82, "recommended": true, "description": "Well-lit commercial area route", "warnings": [], "crowd_density": {{"score": 8, "level": "High", "total_pois": 45, "description": "45 businesses nearby"}}, "lighting": {{"score": 8, "level": "Well-Lit", "total_lights": 30, "description": "30 street lamps detected"}}}},
  {{"id": "route_3", "label": "Balanced", "duration_min": 15, "safety_score": 65, "recommended": false, "description": "Mix of lit and quiet areas", "warnings": ["Moderate crowd after 9 PM"], "crowd_density": {{"score": 6, "level": "Moderate", "total_pois": 20, "description": "20 businesses nearby"}}, "lighting": {{"score": 6, "level": "Moderate", "total_lights": 15, "description": "15 street lamps detected"}}}}
]}}"""

        chat = LlmChat(
            api_key=os.environ['EMERGENT_LLM_KEY'],
            session_id=f"route-{str(uuid.uuid4())[:8]}",
            system_message="You are a safety analyst. Use the real measured data provided. Return only valid JSON."
        ).with_model("gemini", "gemini-2.5-flash")

        response = await chat.send_message(UserMessage(text=prompt))

        clean = response.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            if clean.endswith("```"):
                clean = clean[:-3]
            clean = clean.strip()

        parsed = json.loads(clean)
        routes = [RouteOption(**r) for r in parsed["routes"]]
        return RouteAnalysisResponse(routes=routes, area_analysis=area_analysis_data)

    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        avg_crowd = area_analysis_data['avg_crowd_score']
        avg_light = area_analysis_data['avg_lighting_score']
        base_score = int((avg_crowd + avg_light) * 5)
        return RouteAnalysisResponse(
            routes=[
                RouteOption(id="route_1", label="Fastest", duration_min=12, safety_score=max(20, base_score - 15), recommended=False,
                    description="Direct route through quieter areas",
                    warnings=[f"Lighting score: {avg_light}/10"] if avg_light < 5 else [],
                    crowd_density={"score": origin_crowd["score"], "level": origin_crowd["level"], "total_pois": origin_crowd["total_pois"], "description": origin_crowd["description"]},
                    lighting={"score": origin_light["score"], "level": origin_light["level"], "total_lights": origin_light["total_lights"], "description": origin_light["description"]}),
                RouteOption(id="route_2", label="Safest", duration_min=18, safety_score=min(95, base_score + 15), recommended=True,
                    description="Route through busier, well-lit areas",
                    warnings=[],
                    crowd_density={"score": dest_crowd["score"], "level": dest_crowd["level"], "total_pois": dest_crowd["total_pois"], "description": dest_crowd["description"]},
                    lighting={"score": dest_light["score"], "level": dest_light["level"], "total_lights": dest_light["total_lights"], "description": dest_light["description"]}),
                RouteOption(id="route_3", label="Balanced", duration_min=15, safety_score=base_score, recommended=False,
                    description="Mixed route - moderate safety",
                    warnings=[f"Crowd density varies: {mid_crowd['level']}"],
                    crowd_density={"score": mid_crowd["score"], "level": mid_crowd["level"], "total_pois": mid_crowd["total_pois"], "description": mid_crowd["description"]},
                    lighting={"score": mid_light["score"], "level": mid_light["level"], "total_lights": mid_light["total_lights"], "description": mid_light["description"]}),
            ],
            area_analysis=area_analysis_data
        )

# ── Seed Data ──

@api_router.post("/seed")
async def seed_data():
    existing = await db.safety_scores.count_documents({})
    if existing > 0:
        return {"status": "already seeded"}

    safety_data = [
        {"id": str(uuid.uuid4()), "route_id": "bus_401", "route_type": "transport", "area_name": "Bus Route 401 - Downtown to Suburbs", "score": 4.1, "lighting_score": 3.0, "crowd_score": 5.0, "cctv_available": False, "time_of_day": "evening", "last_updated": datetime.now(timezone.utc).isoformat(), "best_time": "Before 8 PM", "warning": "High harassment reports after 9 PM"},
        {"id": str(uuid.uuid4()), "route_id": "bus_205", "route_type": "transport", "area_name": "Bus Route 205 - Station to Mall", "score": 6.5, "lighting_score": 7.0, "crowd_score": 6.0, "cctv_available": True, "time_of_day": "all", "last_updated": datetime.now(timezone.utc).isoformat(), "best_time": "All day", "warning": "Crowded during peak hours"},
        {"id": str(uuid.uuid4()), "route_id": "metro_green", "route_type": "transport", "area_name": "Metro Green Line", "score": 7.8, "lighting_score": 9.0, "crowd_score": 7.0, "cctv_available": True, "time_of_day": "all", "last_updated": datetime.now(timezone.utc).isoformat(), "best_time": "Until 10 PM", "warning": "Women's coach available"},
        {"id": str(uuid.uuid4()), "route_id": "metro_blue", "route_type": "transport", "area_name": "Metro Blue Line", "score": 8.2, "lighting_score": 9.0, "crowd_score": 8.0, "cctv_available": True, "time_of_day": "all", "last_updated": datetime.now(timezone.utc).isoformat(), "best_time": "All day", "warning": "Well monitored"},
        {"id": str(uuid.uuid4()), "route_id": "bus_112", "route_type": "transport", "area_name": "Bus Route 112 - Airport Express", "score": 7.0, "lighting_score": 8.0, "crowd_score": 5.0, "cctv_available": True, "time_of_day": "morning", "last_updated": datetime.now(timezone.utc).isoformat(), "best_time": "6 AM - 8 PM", "warning": "Less crowded late night"},
        {"id": str(uuid.uuid4()), "route_id": "bus_303", "route_type": "transport", "area_name": "Bus Route 303 - University Loop", "score": 3.5, "lighting_score": 2.0, "crowd_score": 4.0, "cctv_available": False, "time_of_day": "evening", "last_updated": datetime.now(timezone.utc).isoformat(), "best_time": "Before 7 PM", "warning": "Poorly lit stops, avoid after dark"},
    ]
    await db.safety_scores.insert_many(safety_data)
    return {"status": "seeded", "count": len(safety_data)}

# ── Health ──

@api_router.get("/")
async def root():
    return {"message": "SafeHer API is running", "version": "1.0.0"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.trusted_contacts.create_index("user_id")
    await db.trips.create_index([("user_id", 1), ("status", 1)])
    await db.location_trail.create_index("trip_id")
    await db.reports.create_index("user_id")
    await db.alerts.create_index("user_id")
    logger.info("SafeHer API started. Indexes created.")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
