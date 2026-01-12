import { BasePlugin } from './BasePlugin.js';

/**
 * WeatherPlugin - Provides weather information
 * Uses OpenWeatherMap API (or similar) for weather data
 */
export class WeatherPlugin extends BasePlugin {
  constructor() {
    super();
    this.name = 'weather';
    this.version = '1.0.0';
    this.description = 'Provides weather information and forecasts';
    this.capabilities = ['weather', 'forecast'];
    this.apiKey = '';
    this.apiUrl = 'https://api.openweathermap.org/data/2.5';
  }

  async initialize() {
    await super.initialize();
    // Load API key from config
    this.apiKey = this.config.apiKey || process.env.OPENWEATHER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[WeatherPlugin] No API key configured. Using demo mode.');
    }
  }

  validateConfig(config) {
    if (config.apiKey && typeof config.apiKey !== 'string') {
      return false;
    }
    return true;
  }

  async handleRequest(request) {
    const { action, data } = request;

    try {
      switch (action) {
        case 'current':
          return await this.getCurrentWeather(data.location);
        case 'forecast':
          return await this.getForecast(data.location, data.days || 5);
        case 'alerts':
          return await this.getWeatherAlerts(data.location);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get current weather for a location
   * @param {string} location - City name or coordinates
   * @returns {Promise<Object>} Weather data
   */
  async getCurrentWeather(location) {
    if (!this.apiKey) {
      return this.getDemoWeather(location);
    }

    const url = `${this.apiUrl}/weather?q=${encodeURIComponent(location)}&appid=${this.apiKey}&units=metric`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.formatWeatherData(data);
  }

  /**
   * Get weather forecast
   * @param {string} location - City name
   * @param {number} days - Number of days (1-5)
   * @returns {Promise<Object>} Forecast data
   */
  async getForecast(location, days = 5) {
    if (!this.apiKey) {
      return this.getDemoForecast(location, days);
    }

    const url = `${this.apiUrl}/forecast?q=${encodeURIComponent(location)}&appid=${this.apiKey}&units=metric&cnt=${days * 8}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Forecast API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.formatForecastData(data, days);
  }

  /**
   * Get weather alerts
   * @param {string} location - City name
   * @returns {Promise<Object>} Alert data
   */
  async getWeatherAlerts(location) {
    // Implementation would use OneCall API 3.0
    return {
      success: true,
      location,
      alerts: [],
      message: 'No active weather alerts'
    };
  }

  /**
   * Format raw weather data
   */
  formatWeatherData(data) {
    return {
      success: true,
      location: data.name,
      country: data.sys.country,
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      icon: data.weather[0].icon,
      timestamp: new Date(data.dt * 1000)
    };
  }

  /**
   * Format forecast data
   */
  formatForecastData(data, days) {
    const forecast = [];
    const dailyData = {};

    // Group by day
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000).toDateString();
      if (!dailyData[date]) {
        dailyData[date] = [];
      }
      dailyData[date].push(item);
    });

    // Calculate daily averages
    Object.entries(dailyData).forEach(([date, items]) => {
      const temps = items.map(i => i.main.temp);
      forecast.push({
        date: new Date(date),
        tempMax: Math.round(Math.max(...temps)),
        tempMin: Math.round(Math.min(...temps)),
        condition: items[0].weather[0].main,
        description: items[0].weather[0].description,
        humidity: Math.round(items.reduce((sum, i) => sum + i.main.humidity, 0) / items.length),
        icon: items[0].weather[0].icon
      });
    });

    return {
      success: true,
      location: data.city.name,
      country: data.city.country,
      forecast: forecast.slice(0, days)
    };
  }

  /**
   * Demo mode - return sample data
   */
  getDemoWeather(location) {
    return {
      success: true,
      location: location,
      country: 'DEMO',
      temperature: 22,
      feelsLike: 21,
      condition: 'Clear',
      description: 'clear sky',
      humidity: 60,
      windSpeed: 3.5,
      icon: '01d',
      timestamp: new Date(),
      demoMode: true
    };
  }

  getDemoForecast(location, days) {
    const forecast = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      forecast.push({
        date,
        tempMax: 25 + Math.floor(Math.random() * 5),
        tempMin: 15 + Math.floor(Math.random() * 5),
        condition: ['Clear', 'Clouds', 'Rain'][Math.floor(Math.random() * 3)],
        description: 'sample weather',
        humidity: 50 + Math.floor(Math.random() * 30),
        icon: '01d'
      });
    }

    return {
      success: true,
      location,
      country: 'DEMO',
      forecast,
      demoMode: true
    };
  }
}

export default WeatherPlugin;