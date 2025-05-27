/**
 * @fileoverview Módulo de visualizaciones avanzadas para análisis de motor DC
 * @author Sistema de Control de Motores DC
 * @version 2.0
 * @description Implementa visualizaciones profesionales para respuestas temporales,
 *              diagramas de Bode, lugar de raíces y análisis de estabilidad
 */

import { MOTOR_PARAMS, CONTROL_PARAMS, CALCULATED_VALUES } from './constants.js';

/**
 * Configuración global para gráficas
 */
const PLOT_CONFIG = {
    colors: {
        primary: '#1976d2',
        secondary: '#388e3c',
        accent: '#f57c00',
        error: '#d32f2f',
        grid: '#e0e0e0',
        background: '#fafafa'
    },
    fonts: {
        title: '16px Arial, sans-serif',
        axis: '12px Arial, sans-serif',
        legend: '11px Arial, sans-serif'
    },
    dimensions: {
        width: 800,
        height: 400,
        margin: { top: 40, right: 40, bottom: 60, left: 80 }
    }
};

/**
 * Clase para crear gráficas profesionales con Canvas
 */
class AdvancedPlotter {
    constructor(canvasId, config = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas con ID '${canvasId}' no encontrado`);
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.config = { ...PLOT_CONFIG, ...config };
        
        // Configurar dimensiones del canvas
        this.canvas.width = this.config.dimensions.width;
        this.canvas.height = this.config.dimensions.height;
        
        // Área de dibujo
        this.plotArea = {
            x: this.config.dimensions.margin.left,
            y: this.config.dimensions.margin.top,
            width: this.canvas.width - this.config.dimensions.margin.left - this.config.dimensions.margin.right,
            height: this.canvas.height - this.config.dimensions.margin.top - this.config.dimensions.margin.bottom
        };
    }

    /**
     * Limpia el canvas y prepara para nueva gráfica
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = this.config.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Dibuja la grilla de la gráfica
     * @param {Object} scales - Escalas x e y
     */
    drawGrid(scales) {
        this.ctx.strokeStyle = this.config.colors.grid;
        this.ctx.lineWidth = 0.5;
        this.ctx.setLineDash([2, 2]);

        // Líneas verticales
        for (let i = 0; i <= 10; i++) {
            const x = this.plotArea.x + (i / 10) * this.plotArea.width;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.plotArea.y);
            this.ctx.lineTo(x, this.plotArea.y + this.plotArea.height);
            this.ctx.stroke();
        }

        // Líneas horizontales
        for (let i = 0; i <= 10; i++) {
            const y = this.plotArea.y + (i / 10) * this.plotArea.height;
            this.ctx.beginPath();
            this.ctx.moveTo(this.plotArea.x, y);
            this.ctx.lineTo(this.plotArea.x + this.plotArea.width, y);
            this.ctx.stroke();
        }

        this.ctx.setLineDash([]);
    }

    /**
     * Dibuja los ejes con etiquetas
     * @param {Object} scales - Escalas y etiquetas de los ejes
     */
    drawAxes(scales) {
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.font = this.config.fonts.axis;
        this.ctx.fillStyle = '#000';

        // Eje X
        this.ctx.beginPath();
        this.ctx.moveTo(this.plotArea.x, this.plotArea.y + this.plotArea.height);
        this.ctx.lineTo(this.plotArea.x + this.plotArea.width, this.plotArea.y + this.plotArea.height);
        this.ctx.stroke();

        // Eje Y
        this.ctx.beginPath();
        this.ctx.moveTo(this.plotArea.x, this.plotArea.y);
        this.ctx.lineTo(this.plotArea.x, this.plotArea.y + this.plotArea.height);
        this.ctx.stroke();

        // Etiquetas del eje X
        this.ctx.textAlign = 'center';
        for (let i = 0; i <= 5; i++) {
            const x = this.plotArea.x + (i / 5) * this.plotArea.width;
            const value = scales.xMin + (i / 5) * (scales.xMax - scales.xMin);
            this.ctx.fillText(value.toFixed(1), x, this.plotArea.y + this.plotArea.height + 20);
        }

        // Etiquetas del eje Y
        this.ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const y = this.plotArea.y + this.plotArea.height - (i / 5) * this.plotArea.height;
            const value = scales.yMin + (i / 5) * (scales.yMax - scales.yMin);
            this.ctx.fillText(value.toFixed(2), this.plotArea.x - 10, y + 4);
        }

        // Títulos de los ejes
        this.ctx.textAlign = 'center';
        this.ctx.fillText(scales.xLabel, this.plotArea.x + this.plotArea.width / 2, this.canvas.height - 10);
        
        this.ctx.save();
        this.ctx.translate(20, this.plotArea.y + this.plotArea.height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText(scales.yLabel, 0, 0);
        this.ctx.restore();
    }

    /**
     * Dibuja una serie de datos como línea
     * @param {Array} data - Array de puntos {x, y}
     * @param {Object} scales - Escalas de los ejes
     * @param {string} color - Color de la línea
     * @param {number} lineWidth - Grosor de la línea
     */
    drawLine(data, scales, color = this.config.colors.primary, lineWidth = 2) {
        if (data.length < 2) return;

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.setLineDash([]);

        this.ctx.beginPath();
        
        for (let i = 0; i < data.length; i++) {
            const x = this.plotArea.x + ((data[i].x - scales.xMin) / (scales.xMax - scales.xMin)) * this.plotArea.width;
            const y = this.plotArea.y + this.plotArea.height - ((data[i].y - scales.yMin) / (scales.yMax - scales.yMin)) * this.plotArea.height;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.stroke();
    }

    /**
     * Dibuja el título de la gráfica
     * @param {string} title - Título de la gráfica
     */
    drawTitle(title) {
        this.ctx.font = this.config.fonts.title;
        this.ctx.fillStyle = '#000';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(title, this.canvas.width / 2, 25);
    }

    /**
     * Dibuja una leyenda
     * @param {Array} items - Array de elementos {label, color}
     */
    drawLegend(items) {
        const legendX = this.plotArea.x + this.plotArea.width - 150;
        const legendY = this.plotArea.y + 20;
        
        this.ctx.font = this.config.fonts.legend;
        this.ctx.textAlign = 'left';

        items.forEach((item, index) => {
            const y = legendY + index * 20;
            
            // Línea de color
            this.ctx.strokeStyle = item.color;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(legendX, y);
            this.ctx.lineTo(legendX + 20, y);
            this.ctx.stroke();
            
            // Etiqueta
            this.ctx.fillStyle = '#000';
            this.ctx.fillText(item.label, legendX + 25, y + 4);
        });
    }
}

/**
 * Crea una gráfica de respuesta temporal mejorada
 * @param {string} canvasId - ID del canvas
 * @param {Array} timeData - Datos de tiempo
 * @param {Array} responseData - Datos de respuesta
 * @param {Object} options - Opciones de configuración
 */
export function createAdvancedStepResponse(canvasId, timeData, responseData, options = {}) {
    try {
        const plotter = new AdvancedPlotter(canvasId);
        plotter.clear();

        // Preparar datos
        const data = timeData.map((t, i) => ({ x: t, y: responseData[i] }));
        
        // Calcular escalas
        const xMax = Math.max(...timeData);
        const yMax = Math.max(...responseData) * 1.1;
        const yMin = Math.min(...responseData, 0) * 1.1;
        
        const scales = {
            xMin: 0,
            xMax: xMax,
            yMin: yMin,
            yMax: yMax,
            xLabel: options.xLabel || 'Tiempo (s)',
            yLabel: options.yLabel || 'Velocidad (rad/s)'
        };

        // Dibujar elementos
        plotter.drawGrid(scales);
        plotter.drawAxes(scales);
        plotter.drawLine(data, scales, options.color || PLOT_CONFIG.colors.primary);
        plotter.drawTitle(options.title || 'Respuesta Temporal del Sistema');

        // Agregar línea de estado estacionario si se especifica
        if (options.steadyStateValue) {
            const ssData = [
                { x: 0, y: options.steadyStateValue },
                { x: xMax, y: options.steadyStateValue }
            ];
            plotter.drawLine(ssData, scales, PLOT_CONFIG.colors.accent, 1);
            
            plotter.drawLegend([
                { label: 'Respuesta del sistema', color: options.color || PLOT_CONFIG.colors.primary },
                { label: 'Estado estacionario', color: PLOT_CONFIG.colors.accent }
            ]);
        }

        console.log(`✅ Gráfica avanzada creada en ${canvasId}`);
        
    } catch (error) {
        console.error(`❌ Error creando gráfica avanzada: ${error.message}`);
        throw error;
    }
}

/**
 * Crea una gráfica comparativa de múltiples respuestas
 * @param {string} canvasId - ID del canvas
 * @param {Array} datasets - Array de datasets {time, response, label, color}
 * @param {Object} options - Opciones de configuración
 */
export function createComparativeResponse(canvasId, datasets, options = {}) {
    try {
        const plotter = new AdvancedPlotter(canvasId);
        plotter.clear();

        // Calcular escalas globales
        let xMax = 0, yMax = -Infinity, yMin = Infinity;
        
        datasets.forEach(dataset => {
            xMax = Math.max(xMax, Math.max(...dataset.time));
            yMax = Math.max(yMax, Math.max(...dataset.response));
            yMin = Math.min(yMin, Math.min(...dataset.response));
        });

        const scales = {
            xMin: 0,
            xMax: xMax,
            yMin: yMin * 1.1,
            yMax: yMax * 1.1,
            xLabel: options.xLabel || 'Tiempo (s)',
            yLabel: options.yLabel || 'Respuesta'
        };

        // Dibujar elementos base
        plotter.drawGrid(scales);
        plotter.drawAxes(scales);

        // Dibujar cada dataset
        const legendItems = [];
        datasets.forEach((dataset, index) => {
            const data = dataset.time.map((t, i) => ({ x: t, y: dataset.response[i] }));
            const color = dataset.color || PLOT_CONFIG.colors[index % 3 === 0 ? 'primary' : index % 3 === 1 ? 'secondary' : 'accent'];
            
            plotter.drawLine(data, scales, color, 2);
            legendItems.push({ label: dataset.label, color: color });
        });

        plotter.drawTitle(options.title || 'Comparación de Respuestas');
        plotter.drawLegend(legendItems);

        console.log(`✅ Gráfica comparativa creada en ${canvasId}`);
        
    } catch (error) {
        console.error(`❌ Error creando gráfica comparativa: ${error.message}`);
        throw error;
    }
}

/**
 * Crea un diagrama de polos y ceros
 * @param {string} canvasId - ID del canvas
 * @param {Array} poles - Array de polos del sistema
 * @param {Array} zeros - Array de ceros del sistema (opcional)
 * @param {Object} options - Opciones de configuración
 */
export function createPoleZeroPlot(canvasId, poles, zeros = [], options = {}) {
    try {
        const plotter = new AdvancedPlotter(canvasId);
        plotter.clear();

        // Determinar límites del plano complejo
        let maxReal = Math.max(...poles.map(p => typeof p === 'number' ? p : p.real));
        let minReal = Math.min(...poles.map(p => typeof p === 'number' ? p : p.real));
        let maxImag = Math.max(...poles.map(p => typeof p === 'number' ? 0 : Math.abs(p.imag)));
        
        const margin = Math.max(Math.abs(maxReal), Math.abs(minReal), maxImag) * 0.2;
        
        const scales = {
            xMin: minReal - margin,
            xMax: maxReal + margin,
            yMin: -maxImag - margin,
            yMax: maxImag + margin,
            xLabel: 'Parte Real',
            yLabel: 'Parte Imaginaria'
        };

        // Dibujar elementos base
        plotter.drawGrid(scales);
        plotter.drawAxes(scales);

        // Dibujar círculo unitario (referencia de estabilidad)
        plotter.ctx.strokeStyle = PLOT_CONFIG.colors.grid;
        plotter.ctx.lineWidth = 1;
        plotter.ctx.setLineDash([5, 5]);
        
        const centerX = plotter.plotArea.x + ((0 - scales.xMin) / (scales.xMax - scales.xMin)) * plotter.plotArea.width;
        const centerY = plotter.plotArea.y + plotter.plotArea.height - ((0 - scales.yMin) / (scales.yMax - scales.yMin)) * plotter.plotArea.height;
        const radius = (1 / (scales.xMax - scales.xMin)) * plotter.plotArea.width;
        
        plotter.ctx.beginPath();
        plotter.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        plotter.ctx.stroke();
        plotter.ctx.setLineDash([]);

        // Dibujar polos
        plotter.ctx.fillStyle = PLOT_CONFIG.colors.error;
        poles.forEach(pole => {
            const real = typeof pole === 'number' ? pole : pole.real;
            const imag = typeof pole === 'number' ? 0 : pole.imag;
            
            const x = plotter.plotArea.x + ((real - scales.xMin) / (scales.xMax - scales.xMin)) * plotter.plotArea.width;
            const y = plotter.plotArea.y + plotter.plotArea.height - ((imag - scales.yMin) / (scales.yMax - scales.yMin)) * plotter.plotArea.height;
            
            // Dibujar X para polos
            plotter.ctx.lineWidth = 3;
            plotter.ctx.strokeStyle = PLOT_CONFIG.colors.error;
            plotter.ctx.beginPath();
            plotter.ctx.moveTo(x - 5, y - 5);
            plotter.ctx.lineTo(x + 5, y + 5);
            plotter.ctx.moveTo(x + 5, y - 5);
            plotter.ctx.lineTo(x - 5, y + 5);
            plotter.ctx.stroke();
        });

        plotter.drawTitle(options.title || 'Diagrama de Polos y Ceros');
        
        const legendItems = [
            { label: 'Polos', color: PLOT_CONFIG.colors.error },
            { label: 'Círculo unitario', color: PLOT_CONFIG.colors.grid }
        ];
        plotter.drawLegend(legendItems);

        console.log(`✅ Diagrama de polos y ceros creado en ${canvasId}`);
        
    } catch (error) {
        console.error(`❌ Error creando diagrama de polos y ceros: ${error.message}`);
        throw error;
    }
}

/**
 * Exporta funciones de utilidad para análisis visual
 */
export const VisualizationUtils = {
    /**
     * Calcula métricas de respuesta temporal
     * @param {Array} timeData - Datos de tiempo
     * @param {Array} responseData - Datos de respuesta
     * @param {number} steadyStateValue - Valor de estado estacionario
     * @returns {Object} Métricas calculadas
     */
    calculateResponseMetrics(timeData, responseData, steadyStateValue) {
        const tolerance = 0.02; // 2% de tolerancia
        const targetValue = steadyStateValue * (1 - tolerance);
        
        // Tiempo de subida (10% a 90%)
        const value10 = steadyStateValue * 0.1;
        const value90 = steadyStateValue * 0.9;
        
        let riseTime = null;
        let settlingTime = null;
        let overshoot = 0;
        
        // Encontrar tiempo de subida
        let t10 = null, t90 = null;
        for (let i = 0; i < responseData.length; i++) {
            if (t10 === null && responseData[i] >= value10) t10 = timeData[i];
            if (t90 === null && responseData[i] >= value90) t90 = timeData[i];
            if (t10 !== null && t90 !== null) break;
        }
        if (t10 !== null && t90 !== null) riseTime = t90 - t10;
        
        // Encontrar sobrepaso
        const maxValue = Math.max(...responseData);
        if (maxValue > steadyStateValue) {
            overshoot = ((maxValue - steadyStateValue) / steadyStateValue) * 100;
        }
        
        // Encontrar tiempo de establecimiento
        for (let i = responseData.length - 1; i >= 0; i--) {
            if (Math.abs(responseData[i] - steadyStateValue) > Math.abs(steadyStateValue * tolerance)) {
                settlingTime = timeData[i];
                break;
            }
        }
        
        return {
            riseTime: riseTime,
            settlingTime: settlingTime,
            overshoot: overshoot,
            steadyStateValue: steadyStateValue,
            peakValue: maxValue
        };
    },

    /**
     * Genera datos para respuesta escalón analítica
     * @param {Object} transferFunc - Función de transferencia
     * @param {number} stepSize - Amplitud del escalón
     * @param {number} duration - Duración de la simulación
     * @param {number} samples - Número de muestras
     * @returns {Object} Datos de tiempo y respuesta
     */
    generateAnalyticalStepResponse(transferFunc, stepSize = 1, duration = 5, samples = 1000) {
        const dt = duration / samples;
        const timeData = Array.from({ length: samples }, (_, i) => i * dt);
        const responseData = [];
        
        const { a2, a1, a0, b0 } = transferFunc.coefficients;
        
        // Calcular respuesta basada en los polos del sistema
        const discriminant = Math.pow(a1, 2) - 4 * a2 * a0;
        
        if (discriminant >= 0) {
            // Polos reales
            const p1 = (-a1 + Math.sqrt(discriminant)) / (2 * a2);
            const p2 = (-a1 - Math.sqrt(discriminant)) / (2 * a2);
            
            timeData.forEach(t => {
                const response = stepSize * (b0 / a0) * (1 - Math.exp(p1 * t) - Math.exp(p2 * t));
                responseData.push(response);
            });
        } else {
            // Polos complejos
            const realPart = -a1 / (2 * a2);
            const imagPart = Math.sqrt(-discriminant) / (2 * a2);
            const naturalFreq = Math.sqrt(a0 / a2);
            const dampingRatio = a1 / (2 * Math.sqrt(a2 * a0));
            
            timeData.forEach(t => {
                const envelope = Math.exp(realPart * t);
                const oscillation = Math.cos(imagPart * t);
                const response = stepSize * (b0 / a0) * (1 - envelope * oscillation);
                responseData.push(response);
            });
        }
        
        return { timeData, responseData };
    }
};

export default {
    AdvancedPlotter,
    createAdvancedStepResponse,
    createComparativeResponse,
    createPoleZeroPlot,
    VisualizationUtils,
    PLOT_CONFIG
}; 