// js/plotting.js

/**
 * Grafica la respuesta al escalón de un sistema de segundo orden.
 * 
 * @param {string} containerId - ID del contenedor HTML para el gráfico
 * @param {number} gain - Ganancia del sistema (numerador)
 * @param {number} a2 - Coeficiente de s² en el denominador
 * @param {number} a1 - Coeficiente de s¹ en el denominador
 * @param {number} a0 - Coeficiente de s⁰ en el denominador
 * @param {boolean} isDisturbance - Indica si esta es una respuesta a perturbación (invertir signo)
 * @returns {object} Objeto con parámetros calculados y puntos de datos
 */
function plotStepResponse(containerId, gain, a2, a1, a0, isDisturbance) {
    // Limpiar contenedor y crear canvas para Chart.js
    const plotContainer = document.getElementById(containerId);
    plotContainer.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '200px';
    plotContainer.appendChild(canvas);
    
    // Calcular los parámetros normalizados del sistema de segundo orden
    const wn = Math.sqrt(a0 / a2);
    const zeta = a1 / (2 * wn * a2);
    
    // Calcular tiempo de simulación basado en la dinámica del sistema
    let simTime = 15 / (zeta * wn);     // Aproximadamente 5 constantes de tiempo
    simTime = Math.min(Math.max(simTime, 5), 50);  // Limitar entre 5s y 50s
    
    // Calcular valor final del sistema
    const finalValueSystem = gain / a0;
    
    // Parámetros de la simulación
    const numPoints = 100;
    const dt = simTime / numPoints;
    
    // Arreglos para almacenar los puntos
    let times = [];
    let values = [];
    let dataPoints = [];
    
    // Generar puntos para diferentes escenarios de amortiguamiento
    for (let i = 0; i <= numPoints; i++) {
        const t = i * dt;
        times.push(t);
        
        let y = 0;
        if (zeta < 1) {  // Subamortiguado
            const wd = wn * Math.sqrt(1 - zeta * zeta);
            y = finalValueSystem * (1 - Math.exp(-zeta * wn * t) * (Math.cos(wd * t) + (zeta * wn / wd) * Math.sin(wd * t)));
        } else if (zeta === 1) {  // Críticamente amortiguado
            y = finalValueSystem * (1 - Math.exp(-wn * t) * (1 + wn * t));
        } else {  // Sobreamortiguado
            const r1 = -zeta * wn + wn * Math.sqrt(zeta * zeta - 1);
            const r2 = -zeta * wn - wn * Math.sqrt(zeta * zeta - 1);
            y = finalValueSystem * (1 - (r1 * Math.exp(r2 * t) - r2 * Math.exp(r1 * t)) / (r1 - r2));
        }
        
        if (isDisturbance) {
            y = -y; // Para perturbaciones (TL), invertimos el signo
        }
        
        values.push(y);
        dataPoints.push({ t: t, y: y });
    }
    
    // Crear el gráfico con Chart.js
    const chartLabel = isDisturbance ? 'Respuesta a TL (rad/s)' : 'Respuesta a Vr (rad/s)';
    const chartColor = isDisturbance ? 'rgb(255, 99, 132)' : 'rgb(54, 162, 235)';
    
    const chart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: times,
            datasets: [{
                label: chartLabel,
                data: values,
                borderColor: chartColor,
                backgroundColor: chartColor.replace(')', ', 0.1)').replace('rgb', 'rgba'),
                tension: 0.1,
                pointRadius: 0
            }]
        },
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Tiempo (s)'
                    },
                    ticks: {
                        callback: function(value) {
                            const index = Math.round(value);
                            return index >= 0 && index < times.length ? times[index].toFixed(1) : '';
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Velocidad (rad/s)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${chartLabel}: ${context.parsed.y.toFixed(3)} rad/s`;
                        }
                    }
                }
            },
            animation: false,
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    // Calcular características adicionales de la respuesta
    const settlingTime = 4 / (zeta * wn);
    const peakTime = zeta < 1 ? Math.PI / (wn * Math.sqrt(1 - zeta * zeta)) : 0;
    const overshoot = zeta < 1 ? 100 * Math.exp(-Math.PI * zeta / Math.sqrt(1 - zeta * zeta)) : 0;

    // Devolver parámetros calculados y puntos para uso posterior
    return {
        wn: wn,
        zeta: zeta,
        settlingTime: settlingTime,
        peakTime: peakTime,
        overshoot: overshoot,
        finalValueSystem: finalValueSystem,
        dataPoints: dataPoints
    };
} 