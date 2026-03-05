import * as Location from 'expo-location';
import { Platform, Alert } from 'react-native';

export interface LocationCoords {
  lat: number;
  lng: number;
  speed: number;
  accuracy: number;
}

class LocationService {
  private watchSubscription: Location.LocationSubscription | null = null;
  private hasPermission = false;
  private hasBackgroundPermission = false;

  async requestForegroundPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch {
      return false;
    }
  }

  async requestBackgroundPermission(): Promise<boolean> {
    try {
      // Must have foreground first
      if (!this.hasPermission) {
        const fg = await this.requestForegroundPermission();
        if (!fg) return false;
      }
      const { status } = await Location.requestBackgroundPermissionsAsync();
      this.hasBackgroundPermission = status === 'granted';
      return this.hasBackgroundPermission;
    } catch {
      return false;
    }
  }

  async requestAllPermissions(): Promise<{ foreground: boolean; background: boolean }> {
    const foreground = await this.requestForegroundPermission();
    let background = false;
    if (foreground) {
      background = await this.requestBackgroundPermission();
    }
    return { foreground, background };
  }

  async getCurrentLocation(): Promise<LocationCoords | null> {
    try {
      if (!this.hasPermission) {
        const granted = await this.requestForegroundPermission();
        if (!granted) return null;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        speed: loc.coords.speed || 0,
        accuracy: loc.coords.accuracy || 0,
      };
    } catch {
      return null;
    }
  }

  async startWatching(callback: (coords: LocationCoords) => void, intervalMs = 5000): Promise<void> {
    try {
      if (!this.hasPermission) {
        const granted = await this.requestForegroundPermission();
        if (!granted) return;
      }
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: intervalMs,
          distanceInterval: 10,
        },
        (loc) => {
          callback({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            speed: loc.coords.speed || 0,
            accuracy: loc.coords.accuracy || 0,
          });
        }
      );
    } catch (e) {
      console.warn('Location watch error:', e);
    }
  }

  stopWatching(): void {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
  }

  getPermissionStatus(): { foreground: boolean; background: boolean } {
    return { foreground: this.hasPermission, background: this.hasBackgroundPermission };
  }
}

export const locationService = new LocationService();
