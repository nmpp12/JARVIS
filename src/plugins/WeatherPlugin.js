/**
 * Weather Plugin
 * Provides weather information and forecasts
 */

import BasePlugin from './BasePlugin.js';

export class WeatherPlugin extends BasePlugin {
    constructor() {
        super('weather', 'Provides weather information and forecasts');
        this.apiKey = null; // Would be set from config
        this.defaultLocation = 'Lisbon';
        this.units = 'metric'; // metric or imperial
    }

    async initialize() {
        await super.initialize();
        this.log('Weather plugin ready');
        return true;
    }

    /**
     * Validate parameters
     */
    validate(params) {
        // Location is optional, will use default if not provided
        return true;
    }

    /**
     * Execute weather query
     */
    async execute(params) {
        try {
            const location = params.location || this.defaultLocation;
            const action = params.action || 'current';

            this.log(`Getting ${action} weather for ${location}`);

            switch (action) {
                case 'current':
                    return await this.getCurrentWeather(location);
                case 'forecast':
                    return await this.getForecast(location, params.days || 3);
                case 'alerts':
                    return await this.getWeatherAlerts(location);
                default:
                    return await this.getCurrentWeather(location);
            }
        } catch (error) {
            return this.handleError(error, 'executing weather query');
        }
    }

    /**
     * Get current weather
     */
    async getCurrentWeather(location) {
        try {
            // Mock data for now - would call real API in production
            const mockWeather = this.generateMockWeather(location);

            return this.formatCurrentWeather(mockWeather);
        } catch (error) {
            throw new Error(`Failed to get current weather: ${error.message}`);
        }
    }

    /**
     * Get weather forecast
     */
    async getForecast(location, days = 3) {
        try {
            // Mock data for now
            const forecast = this.generateMockForecast(location, days);

            return this.formatForecast(forecast);
        } catch (error) {
            throw new Error(`Failed to get forecast: ${error.message}`);
        }
    }

    /**
     * Get weather alerts
     */
    async getWeatherAlerts(location) {
        // Mock - would check real weather alerts
        return `No weather alerts for ${location} at this time.`;
    }

    /**
     * Generate mock weather data
     */
    generateMockWeather(location) {
        const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Sunny'];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        
        return {
            location,
            condition,
            temperature: Math.floor(Math.random() * 20) + 10, // 10-30°C
            humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
            windSpeed: Math.floor(Math.random() * 20) + 5, // 5-25 km/h
            pressure: Math.floor(Math.random() * 30) + 1000, // 1000-1030 hPa
            visibility: Math.floor(Math.random() * 5) + 10, // 10-15 km
            uvIndex: Math.floor(Math.random() * 8) + 1 // 1-8
        };
    }

    /**
     * Generate mock forecast
     */
    generateMockForecast(location, days) {
        const forecast = [];
        const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Sunny'];

        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);

            forecast.push({
                date: date.toLocaleDateString(),
                condition: conditions[Math.floor(Math.random() * conditions.length)],
                high: Math.floor(Math.random() * 10) + 20,
                low: Math.floor(Math.random() * 10) + 10,
                precipitation: Math.floor(Math.random() * 100)
            });
        }

        return { location, days, forecast };
    }

    /**
     * Format current weather for display
     */
    formatCurrentWeather(weather) {
        return [
            `Current weather in ${weather.location}:`,
            `🌡️ Temperature: ${weather.temperature}°C`,
            `☁️ Condition: ${weather.condition}`,
            `💧 Humidity: ${weather.humidity}%`,
            `🌬️ Wind Speed: ${weather.windSpeed} km/h`,
            `📉 Pressure: ${weather.pressure} hPa`,
            `👁️ Visibility: ${weather.visibility} km`,
            `☀️ UV Index: ${weather.uvIndex}`
        ].join('\n');
    }

    /**
     * Format forecast for display
     */
    formatForecast(data) {
        const lines = [`${data.days}-day forecast for ${data.location}:\n`];

        data.forecast.forEach(day => {
            lines.push(
                `📅 ${day.date}:`,
                `   ${day.condition}`,
                `   High: ${day.high}°C | Low: ${day.low}°C`,
                `   Precipitation: ${day.precipitation}%`,
                ''
            );
        });

        return lines.join('\n');
    }

    /**
     * Set default location
     */
    setDefaultLocation(location) {
        this.defaultLocation = location;
        this.log(`Default location set to: ${location}`);
    }

    /**
     * Set units (metric/imperial)
     */
    setUnits(units) {
        if (['metric', 'imperial'].includes(units)) {
            this.units = units;
            this.log(`Units set to: ${units}`);
            return true;
        }
        return false;
    }

    /**
     * Set API key for real weather service
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        this.log('API key configured');
    }
}

export default WeatherPlugin;