/**
 * @fileoverview Módulo de cálculos para análisis de motor DC con control de velocidad
 * @author Sistema de Control de Motores DC
 * @version 2.0
 * @description Implementa funciones para análisis dinámico, cálculo de funciones de transferencia
 *              y simulación de respuesta temporal del sistema de control de motor DC
 */

import { MOTOR_PARAMS, CONTROL_PARAMS, CALCULATED_VALUES, p2b_coeffs } from './constants.js';

/**
 * Clase para manejo de errores específicos del sistema de control
 */
class ControlSystemError extends Error {
    constructor(message, code = 'CALC_ERROR') {
        super(message);
        this.name = 'ControlSystemError';
        this.code = code;
    }
}

/**
 * Valida que un parámetro sea un número válido
 * @param {*} value - Valor a validar
 * @param {string} paramName - Nombre del parámetro para mensajes de error
 * @param {number} min - Valor mínimo permitido (opcional)
 * @param {number} max - Valor máximo permitido (opcional)
 * @throws {ControlSystemError} Si el valor no es válido
 */
function validateNumericParameter(value, paramName, min = -Infinity, max = Infinity) {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        throw new ControlSystemError(`${paramName} debe ser un número válido. Recibido: ${value}`, 'INVALID_PARAM');
    }
    if (value < min || value > max) {
        throw new ControlSystemError(`${paramName} debe estar entre ${min} y ${max}. Recibido: ${value}`, 'OUT_OF_RANGE');
    }
}

/**
 * Formatea un número para visualización con precisión específica
 * @param {number} value - Número a formatear
 * @param {number} precision - Número de decimales
 * @returns {string} Número formateado
 */
function formatNumber(value, precision = 4) {
    if (!isFinite(value)) return 'N/A';
    return Number(value).toFixed(precision);
}

/**
 * Calcula los coeficientes de la función de transferencia H_Vr(s) = ω(s)/V_r(s)
 * Esta función relaciona la velocidad angular del motor con la tensión de referencia
 * 
 * @returns {Object} Objeto con coeficientes y función de transferencia
 * @throws {ControlSystemError} Si hay errores en los cálculos
 */
export function calculateTransferFunctionCoefficients() {
    try {
        console.log('🔧 Iniciando cálculo de coeficientes de función de transferencia H_Vr(s)...');
        
        // Validar parámetros críticos
        validateNumericParameter(MOTOR_PARAMS.J, 'Inercia (J)', 0);
        validateNumericParameter(MOTOR_PARAMS.B, 'Fricción viscosa (B)', 0);
        validateNumericParameter(MOTOR_PARAMS.Ra, 'Resistencia de armadura (Ra)', 0);
        validateNumericParameter(MOTOR_PARAMS.La, 'Inductancia de armadura (La)', 0);
        validateNumericParameter(CALCULATED_VALUES.Keff, 'Constante efectiva (Keff)', 0);
        
        // Coeficientes del denominador: a₂s² + a₁s + a₀
        const a2 = MOTOR_PARAMS.J * MOTOR_PARAMS.La;
        const a1 = MOTOR_PARAMS.J * MOTOR_PARAMS.Ra + MOTOR_PARAMS.B * MOTOR_PARAMS.La;
        const a0 = MOTOR_PARAMS.B * MOTOR_PARAMS.Ra + Math.pow(CALCULATED_VALUES.Keff, 2);
        
        // Coeficiente del numerador: b₀
        const b0 = CALCULATED_VALUES.Keff;
        
        // Validar que los coeficientes sean válidos
        validateNumericParameter(a2, 'Coeficiente a2', 0);
        validateNumericParameter(a1, 'Coeficiente a1', 0);
        validateNumericParameter(a0, 'Coeficiente a0', 0);
        validateNumericParameter(b0, 'Coeficiente b0', 0);
        
        // Calcular ganancia DC
        const dcGain = b0 / a0;
        
        // Calcular polos del sistema (raíces del denominador)
        const discriminant = Math.pow(a1, 2) - 4 * a2 * a0;
        let poles = [];
        
        if (discriminant >= 0) {
            // Polos reales
            const p1 = (-a1 + Math.sqrt(discriminant)) / (2 * a2);
            const p2 = (-a1 - Math.sqrt(discriminant)) / (2 * a2);
            poles = [p1, p2];
        } else {
            // Polos complejos conjugados
            const realPart = -a1 / (2 * a2);
            const imagPart = Math.sqrt(-discriminant) / (2 * a2);
            poles = [
                { real: realPart, imag: imagPart },
                { real: realPart, imag: -imagPart }
            ];
        }
        
        const result = {
            coefficients: { a2, a1, a0, b0 },
            dcGain,
            poles,
            transferFunction: `H_Vr(s) = ${formatNumber(b0)} / (${formatNumber(a2)}s² + ${formatNumber(a1)}s + ${formatNumber(a0)})`,
            timestamp: new Date().toISOString()
        };
        
        console.log('✅ Cálculo de H_Vr(s) completado exitosamente');
        console.log('📊 Coeficientes:', result.coefficients);
        console.log('📈 Ganancia DC:', formatNumber(dcGain));
        
        return result;
        
    } catch (error) {
        console.error('❌ Error en cálculo de función de transferencia:', error.message);
        throw new ControlSystemError(`Error calculando H_Vr(s): ${error.message}`, 'TRANSFER_FUNC_ERROR');
    }
}

/**
 * Calcula la velocidad en estado estacionario para una entrada escalón
 * 
 * @param {number} stepInput - Amplitud del escalón de entrada (V)
 * @returns {Object} Velocidad en estado estacionario y tiempo de establecimiento estimado
 * @throws {ControlSystemError} Si hay errores en los cálculos
 */
export function calculateSteadyStateVelocity(stepInput = 1.0) {
    try {
        validateNumericParameter(stepInput, 'Entrada escalón', 0);
        
        console.log(`🎯 Calculando velocidad en estado estacionario para escalón de ${stepInput}V...`);
        
        const transferFunc = calculateTransferFunctionCoefficients();
        const steadyStateVelocity = transferFunc.dcGain * stepInput;
        
        // Estimar tiempo de establecimiento (aproximación para sistema de 2do orden)
        const { a2, a1, a0 } = transferFunc.coefficients;
        const naturalFreq = Math.sqrt(a0 / a2);
        const dampingRatio = a1 / (2 * Math.sqrt(a2 * a0));
        
        let settlingTime;
        if (dampingRatio < 1) {
            // Sistema subamortiguado
            settlingTime = 4 / (dampingRatio * naturalFreq);
        } else {
            // Sistema sobreamortiguado o críticamente amortiguado
            settlingTime = 4 / Math.abs(Math.max(...transferFunc.poles.map(p => 
                typeof p === 'number' ? p : p.real
            )));
        }
        
        const result = {
            steadyStateVelocity,
            settlingTime,
            naturalFrequency: naturalFreq,
            dampingRatio,
            stepInput,
            systemType: dampingRatio < 1 ? 'Subamortiguado' : 
                       dampingRatio === 1 ? 'Críticamente amortiguado' : 'Sobreamortiguado'
        };
        
        console.log(`✅ Velocidad estado estacionario: ${formatNumber(steadyStateVelocity)} rad/s`);
        console.log(`⏱️ Tiempo de establecimiento estimado: ${formatNumber(settlingTime)} s`);
        
        return result;
        
    } catch (error) {
        console.error('❌ Error calculando estado estacionario:', error.message);
        throw new ControlSystemError(`Error en cálculo de estado estacionario: ${error.message}`, 'STEADY_STATE_ERROR');
    }
}

/**
 * Calcula la ganancia del controlador para lograr una velocidad deseada
 * 
 * @param {number} desiredVelocity - Velocidad deseada (rad/s)
 * @param {number} referenceVoltage - Voltaje de referencia (V)
 * @returns {Object} Ganancia calculada y parámetros relacionados
 * @throws {ControlSystemError} Si hay errores en los cálculos
 */
export function calculateControllerGain(desiredVelocity, referenceVoltage = 1.0) {
    try {
        validateNumericParameter(desiredVelocity, 'Velocidad deseada', 0);
        validateNumericParameter(referenceVoltage, 'Voltaje de referencia', 0);
        
        console.log(`🎛️ Calculando ganancia del controlador para ${formatNumber(desiredVelocity)} rad/s...`);
        
        const transferFunc = calculateTransferFunctionCoefficients();
        const requiredGain = desiredVelocity / (transferFunc.dcGain * referenceVoltage);
        
        // Verificar estabilidad con la nueva ganancia
        const { a2, a1, a0 } = transferFunc.coefficients;
        const newA0 = a0 + transferFunc.coefficients.b0 * requiredGain;
        const newDampingRatio = a1 / (2 * Math.sqrt(a2 * newA0));
        
        const result = {
            controllerGain: requiredGain,
            isStable: newDampingRatio > 0,
            newDampingRatio,
            desiredVelocity,
            referenceVoltage,
            systemStability: newDampingRatio > 0 ? 'Estable' : 'Inestable'
        };
        
        console.log(`✅ Ganancia del controlador: ${formatNumber(requiredGain)}`);
        console.log(`🔒 Sistema ${result.systemStability.toLowerCase()}`);
        
        return result;
        
    } catch (error) {
        console.error('❌ Error calculando ganancia del controlador:', error.message);
        throw new ControlSystemError(`Error en cálculo de ganancia: ${error.message}`, 'CONTROLLER_GAIN_ERROR');
    }
}

/**
 * Calcula los coeficientes de las funciones de transferencia del sistema
 * H_Vr(s) = ω(s)/V_r(s) y H_TL(s) = ω(s)/T_L(s).
 * 
 * Esta función:
 * 1. Calcula los coeficientes del denominador común D_cl(s)
 * 2. Calcula los numeradores de ambas funciones de transferencia
 * 3. Muestra los resultados en la interfaz
 * 4. Formatea las ecuaciones usando MathJax
 */
function calculateProblem2b() {
    // Cálculo de los coeficientes del denominador del motor sin realimentación
    const Dm_s2 = MOTOR_PARAMS.J * MOTOR_PARAMS.La;         // Coef. s² (JLa): Término inercial-inductivo
    const Dm_s1 = MOTOR_PARAMS.J * MOTOR_PARAMS.Ra;         // Coef. s¹ (JRa): Término inercial-resistivo
    const Dm_s0 = CALCULATED_VALUES.Keff * CALCULATED_VALUES.Keff;  // Coef. s⁰ (Keff²): Término de acoplamiento electro-mecánico
    
    // Término adicional debido a la realimentación
    const K_term_feedback = CALCULATED_VALUES.Keff * CONTROL_PARAMS.K1 * CONTROL_PARAMS.K2;
    
    // Coeficientes del denominador en lazo cerrado D_cl(s)
    const Dcl_s2 = Dm_s2;                    // Coef. s²: No cambia con la realimentación
    const Dcl_s1 = Dm_s1;                    // Coef. s¹: No cambia con la realimentación
    const Dcl_s0 = Dm_s0 + K_term_feedback;  // Coef. s⁰: Aumenta con realimentación (estabilidad)
    
    // Almacenar coeficientes para uso en otras funciones
    p2b_coeffs.Dcl_s2 = Dcl_s2;
    p2b_coeffs.Dcl_s1 = Dcl_s1;
    p2b_coeffs.Dcl_s0 = Dcl_s0;
    
    // Numerador de H_Vr(s) = ω(s)/V_r(s)|T_L=0
    p2b_coeffs.Num_Hvr_s0 = CALCULATED_VALUES.Keff * CONTROL_PARAMS.K2;  // Ganancia en DC
    
    // Numerador de H_TL(s) = ω(s)/T_L(s)|V_r=0
    p2b_coeffs.Num_Htl_s1 = -MOTOR_PARAMS.La;  // Coef. s¹: Efecto de la inductancia (derivativo)
    p2b_coeffs.Num_Htl_s0 = -MOTOR_PARAMS.Ra;  // Coef. s⁰: Efecto de la resistencia
    
    // Formatear salida para mostrar en la interfaz
    let output = "Coeficientes del Denominador Común D_cl(s) = a_2 s^2 + a_1 s + a_0:\n";
    output += `a_2 (JL_a) = ${Dcl_s2.toFixed(5)}\n`;
    output += `a_1 (JR_a) = ${Dm_s1.toFixed(5)}\n`;
    output += `a_0 (K_eff^2 + K_eff K1 K2) = ${Dcl_s0.toFixed(5)}\n\n`;

    output += "Para H_Vr(s) = Numerador_Vr / D_cl(s):\n";
    output += `Numerador_Vr (K_eff K2) = ${p2b_coeffs.Num_Hvr_s0.toFixed(3)}\n\n`;

    output += "Para H_TL(s) = (Numerador_TL_s1 * s + Numerador_TL_s0) / D_cl(s):\n";
    output += `Numerador_TL_s1 (-L_a) = ${p2b_coeffs.Num_Htl_s1.toFixed(3)}\n`;
    output += `Numerador_TL_s0 (-R_a) = ${p2b_coeffs.Num_Htl_s0.toFixed(3)}\n`;
    
    // Mostrar en la interfaz
    document.getElementById('p2b_output').textContent = output;
    
    // Actualizar el formato matemático de las ecuaciones
    document.getElementById('p2b_Hvr_coeffs_display').innerHTML = 
        `\\(H_{Vr}(s) = \\frac{${p2b_coeffs.Num_Hvr_s0.toFixed(3)}}{${Dcl_s2.toFixed(5)}s^2 + ${Dm_s1.toFixed(5)}s + ${Dcl_s0.toFixed(5)}}\\)`;
    document.getElementById('p2b_Htl_coeffs_display').innerHTML = 
        `\\(H_{TL}(s) = \\frac{${p2b_coeffs.Num_Htl_s1.toFixed(3)}s + ${p2b_coeffs.Num_Htl_s0.toFixed(3)}}{${Dcl_s2.toFixed(5)}s^2 + ${Dm_s1.toFixed(5)}s + ${Dcl_s0.toFixed(5)}}\\)`;
    
    // Renderizar ecuaciones LaTeX
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, "p2b_Hvr_coeffs_display"]);
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, "p2b_Htl_coeffs_display"]);
}

/**
 * Calcula la velocidad en estado estacionario del motor para un voltaje de referencia Vr
 * y un par de carga TL dados, utilizando el Teorema del Valor Final.
 * 
 * Esta función:
 * 1. Verifica/calcula los coeficientes de FT si no están disponibles
 * 2. Evalúa el valor de las FT en s=0 (estado estacionario para entrada escalón)
 * 3. Calcula la respuesta total como superposición de efectos
 * 4. Muestra los resultados detallados
 */
function calculateProblem2d() {
    if (Object.keys(p2b_coeffs).length === 0) {
        calculateProblem2b(); // Asegurar que los coeficientes estén calculados
    }
    const Vr_input = 1.0; // V
    const TL_input = T_L_spec; // Nm

    // Aplicar teorema del valor final: lim s→0 s·F(s) para entrada escalón = lim s→0 F(s)
    const H_Vr_0 = p2b_coeffs.Num_Hvr_s0 / p2b_coeffs.Dcl_s0;
    const H_TL_0 = p2b_coeffs.Num_Htl_s0 / p2b_coeffs.Dcl_s0; // El término s se anula en s=0

    // Velocidad en estado estacionario: ω_ss = H_Vr(0)·Vr + H_TL(0)·TL
    const omega_ss = H_Vr_0 * Vr_input + H_TL_0 * TL_input;

    let output = `H_Vr(0) = ${p2b_coeffs.Num_Hvr_s0.toFixed(3)} / ${p2b_coeffs.Dcl_s0.toFixed(5)} = ${H_Vr_0.toFixed(5)}\n`;
    output += `H_TL(0) = ${p2b_coeffs.Num_Htl_s0.toFixed(3)} / ${p2b_coeffs.Dcl_s0.toFixed(5)} = ${H_TL_0.toFixed(5)}\n\n`;
    output += `Con Vr = ${Vr_input} V y T_L = ${TL_input.toFixed(3)} Nm:\n`;
    output += `ω_ss = H_Vr(0) * Vr + H_TL(0) * T_L\n`;
    output += `ω_ss = ${H_Vr_0.toFixed(5)} * ${Vr_input} + ${H_TL_0.toFixed(5)} * ${TL_input.toFixed(3)}\n`;
    output += `ω_ss = ${omega_ss.toFixed(4)} rad/s`;

    document.getElementById('p2d_output').textContent = output;
}

/**
 * Calcula la ganancia K2 del convertidor para un requisito de regulación de velocidad.
 * 
 * Esta función:
 * 1. Calcula K2 a partir de la ecuación de regulación de velocidad SR
 * 2. Verifica que la solución sea física (K2 > 0)
 * 3. Calcula el valor de Vr para el punto de operación nominal
 * 4. Verifica que la regulación resultante coincida con lo especificado
 */
function calculateProblem3() {
    const SR_desired = 0.005; // Regulación de velocidad deseada: 0.5%
    
    // K2 = (1 / (K_eff_motor * K1)) * ((200 * Ra_motor * T_L_spec / omega_nom_rad_s) - K_eff_motor^2)
    const term1_num = 200 * MOTOR_PARAMS.Ra * T_L_spec;
    const term1 = term1_num / omega_nom_rad_s;
    const term2 = CALCULATED_VALUES.Keff * CALCULATED_VALUES.Keff;
    const numerator_K2 = term1 - term2;
    const denominator_K2 = CALCULATED_VALUES.Keff * CONTROL_PARAMS.K1;

    // Verificar posibles divisiones por cero o soluciones no físicas
    if (denominator_K2 === 0) {
        document.getElementById('p3_output').textContent = "Error: Denominador K_eff_motor * K1 es cero.";
        return;
    }
    if (numerator_K2 < 0 && term1 < term2) {
        document.getElementById('p3_output').textContent = `Error: No se puede alcanzar la regulación. El término (200 Ra T_L_spec / ω_nom) = ${term1.toFixed(4)} es menor que K_eff_motor^2 = ${term2.toFixed(4)}. Esto llevaría a K2 negativo o imaginario.`;
        return;
    }

    const K2_calculated = numerator_K2 / denominator_K2;

    // Calcular Vr para este K2
    // Vr = (201 * Ra_motor * T_L_spec) / (K_eff_motor * K2_calculated)
    let Vr_calculated = "N/A";
    if (K2_calculated !== 0 && CALCULATED_VALUES.Keff !== 0) {
        Vr_calculated = (201 * MOTOR_PARAMS.Ra * T_L_spec) / (CALCULATED_VALUES.Keff * K2_calculated);
    }

    let output = `Para SR = ${SR_desired*100}% y ω_FL = ω_nom = ${omega_nom_rad_s.toFixed(2)} rad/s:\n`;
    output += `Término (200 * Ra * T_L_spec / ω_nom) = ${term1.toFixed(4)}\n`;
    output += `Término (K_eff_motor^2) = ${term2.toFixed(4)}\n`;
    output += `Numerador para K2 = ${numerator_K2.toFixed(4)}\n`;
    output += `Denominador para K2 (K_eff_motor * K1) = ${denominator_K2.toFixed(5)}\n`;
    output += `K2 calculado = ${K2_calculated.toFixed(3)}\n\n`;
    
    // Verificar que la solución funcione según lo esperado
    if (typeof Vr_calculated === 'number') {
        output += `Voltaje de referencia Vr asociado (para ω_FL = ω_nom): ${Vr_calculated.toFixed(3)} V\n`;
        // Verificar ω_NL y ω_FL con este K2 y Vr
        const Dcl_s0_p3 = CALCULATED_VALUES.Keff*CALCULATED_VALUES.Keff + CALCULATED_VALUES.Keff*CONTROL_PARAMS.K1*K2_calculated;
        const omega_NL_check = (CALCULATED_VALUES.Keff * K2_calculated * Vr_calculated) / Dcl_s0_p3;
        const omega_FL_check = (CALCULATED_VALUES.Keff * K2_calculated * Vr_calculated - MOTOR_PARAMS.Ra * T_L_spec) / Dcl_s0_p3;
        const SR_check = (omega_NL_check - omega_FL_check) / omega_FL_check;

        output += `Verificación:\n`;
        output += `  ω_NL con K2=${K2_calculated.toFixed(2)}, Vr=${Vr_calculated.toFixed(2)} V: ${omega_NL_check.toFixed(3)} rad/s\n`;
        output += `  ω_FL con K2=${K2_calculated.toFixed(2)}, Vr=${Vr_calculated.toFixed(2)} V: ${omega_FL_check.toFixed(3)} rad/s (Debería ser cercano a ${omega_nom_rad_s.toFixed(3)} rad/s)\n`;
        output += `  SR calculada = (${omega_NL_check.toFixed(3)} - ${omega_FL_check.toFixed(3)}) / ${omega_FL_check.toFixed(3)} = ${SR_check.toFixed(5)} (Deseado: ${SR_desired})\n`;
    } else {
        output += `No se pudo calcular Vr (K2 o K_eff_motor es cero).\n`;
    }

    document.getElementById('p3_output').textContent = output;
}

/**
 * Simula la respuesta dinámica del sistema en lazo cerrado a entradas de referencia
 * y perturbación, mostrando los resultados de forma gráfica.
 * 
 * Esta función:
 * 1. Calcula parámetros de respuesta del sistema (ωn, ζ)
 * 2. Simula la respuesta a Vr y TL por separado
 * 3. Combina las respuestas considerando los efectos de todos los términos
 * 4. Grafica los resultados utilizando Chart.js
 */
function simulateProblem2c() {
    if (Object.keys(p2b_coeffs).length === 0) {
        calculateProblem2b();
    }
    const Vr_input_sim = 1.0;
    const TL_input_sim = T_L_spec;

    const a2 = p2b_coeffs.Dcl_s2;
    const a1 = p2b_coeffs.Dcl_s1;
    const a0 = p2b_coeffs.Dcl_s0;

    // Calcular parámetros normalizados del sistema de segundo orden
    const wn = Math.sqrt(a0 / a2);
    const zeta = a1 / (2 * wn * a2);

    // Respuesta debido a Vr
    const K_gain_vr = p2b_coeffs.Num_Hvr_s0;
    const resp_vr = plotStepResponse('p2c_plot_vr', K_gain_vr * Vr_input_sim, a2, a1, a0, false);

    // Respuesta debido al término constante de TL (-Ra)
    const K_gain_tl_const_part = p2b_coeffs.Num_Htl_s0;
    const resp_tl_const = plotStepResponse('p2c_plot_tl', K_gain_tl_const_part * TL_input_sim, a2, a1, a0, true);
    
    // Mostrar parámetros en el output
    let output_params = `Parámetros del sistema (denominador D_cl(s) = ${a2.toFixed(4)}s^2 + ${a1.toFixed(4)}s + ${a0.toFixed(4)}): \n`;
    output_params += `  ωn = ${wn.toFixed(3)} rad/s, ζ = ${zeta.toFixed(3)}\n`;
    output_params += `  Valor final (solo de Vr): ${(K_gain_vr * Vr_input_sim / a0).toFixed(4)} rad/s\n`;
    output_params += `  Valor final (solo de -Ra * TL): ${(K_gain_tl_const_part * TL_input_sim / a0).toFixed(4)} rad/s\n`;
    output_params += `  NOTA: La respuesta completa incluye también el efecto del término (-sLa), que tiene características de derivada de la entrada TL.\n`;
    document.getElementById('p2c_params_output').textContent = output_params;

    // Graficar la respuesta total, incluyendo el efecto completo del término -sLa en el numerador
    plotStepResponseTotal('p2c_plot_total', resp_vr, resp_tl_const, Vr_input_sim, TL_input_sim);
}

/**
 * Grafica la respuesta total del sistema combinando la respuesta a Vr y TL.
 * Considera también el efecto del término derivativo sLa en el numerador de H_TL(s).
 * 
 * @param {string} containerId - ID del contenedor HTML para el gráfico
 * @param {object} resp_vr - Objeto con datos de respuesta a Vr
 * @param {object} resp_tl_const - Objeto con datos de respuesta al término constante de TL
 * @param {number} Vr_input - Valor de entrada de referencia
 * @param {number} TL_input - Valor del par de carga
 */
function plotStepResponseTotal(containerId, resp_vr, resp_tl_const, Vr_input, TL_input) {
    const plotContainer = document.getElementById(containerId);
    
    // Limpiar el contenedor y crear un canvas para Chart.js
    plotContainer.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '200px';
    plotContainer.appendChild(canvas);
    
    // Combinar los puntos de datos de ambas respuestas
    let maxTime = 0;
    if(resp_vr.dataPoints.length > 0) {
        const lastPoint_vr = resp_vr.dataPoints[resp_vr.dataPoints.length-1];
        maxTime = Math.max(maxTime, lastPoint_vr.t);
    }
    if(resp_tl_const.dataPoints.length > 0) {
        const lastPoint_tl = resp_tl_const.dataPoints[resp_tl_const.dataPoints.length-1];
        maxTime = Math.max(maxTime, lastPoint_tl.t);
    }
    if(maxTime === 0) maxTime = 50;
    
    // Generar puntos para el gráfico total
    const timePoints = 100;
    const dt = maxTime / timePoints;
    let times = [];
    let values = [];
    
    // Parámetros para respuesta al término sLa (respuesta impulsiva)
    const a2 = p2b_coeffs.Dcl_s2;
    const a1 = p2b_coeffs.Dcl_s1;
    const a0 = p2b_coeffs.Dcl_s0;
    const La_term = p2b_coeffs.Num_Htl_s1; // -La
    
    for(let i = 0; i <= timePoints; i++) {
        const t = i * dt;
        times.push(t);
        
        // Componente de Vr (respuesta a escalón)
        let y_vr = findValueAtTime(resp_vr.dataPoints, t, resp_vr.finalValueSystem * Vr_input);
        
        // Componente de término constante Ra (respuesta a escalón)
        let y_tl_const = findValueAtTime(resp_tl_const.dataPoints, t, resp_tl_const.finalValueSystem * TL_input);
        
        // Componente de término sLa (respuesta impulsiva)
        // La respuesta impulsiva a un sistema de segundo orden es la derivada de la respuesta al escalón
        let y_tl_sLa = 0;
        
        // Calculamos respuesta impulsiva para t muy pequeño (efecto del término sLa)
        if (t < 0.1) { // Solo afecta en los momentos iniciales
            // Para un sistema de segundo orden, la respuesta impulsiva tiene esta forma
            const wn = Math.sqrt(a0 / a2);
            const zeta = (a1 / a2) / (2 * wn);
            
            if (zeta < 1) { // Subamortiguado
                const wd = wn * Math.sqrt(1 - zeta * zeta);
                y_tl_sLa = La_term * TL_input * (wn / Math.sqrt(1 - zeta*zeta)) * Math.exp(-zeta * wn * t) * Math.sin(wd * t) / a2;
            } else if (zeta === 1) { // Amortiguamiento crítico
                y_tl_sLa = La_term * TL_input * (wn*wn) * t * Math.exp(-wn * t) / a2;
            } else { // Sobreamortiguado
                const r1 = -zeta * wn + wn * Math.sqrt(zeta * zeta - 1);
                const r2 = -zeta * wn - wn * Math.sqrt(zeta * zeta - 1);
                y_tl_sLa = La_term * TL_input * (r1 * Math.exp(r1 * t) - r2 * Math.exp(r2 * t)) / (r1 - r2) / a2;
            }
        }
        
        // Suma de todas las respuestas
        const y_total = y_vr + y_tl_const + y_tl_sLa;
        values.push(y_total);
    }
    
    // Crear gráfico con Chart.js
    const chart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: times,
            datasets: [{
                label: 'ω Total (rad/s) - Respuesta Completa',
                data: values,
                borderColor: 'rgb(75, 192, 192)',
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
                        text: 'ω Total (rad/s)'
                    }
                }
            },
            animation: false,
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

/**
 * Función auxiliar para encontrar el valor en un tiempo específico
 * en un conjunto de datos previamente calculados.
 * 
 * @param {Array} dataPoints - Array de objetos {t, y} con datos de la respuesta
 * @param {number} time - Tiempo específico para buscar
 * @param {number} defaultValue - Valor a devolver si no se encuentra un punto adecuado
 * @returns {number} El valor y correspondiente al tiempo especificado
 */
function findValueAtTime(dataPoints, time, defaultValue) {
    if (!dataPoints || dataPoints.length === 0) return defaultValue;
    
    // Buscar el punto más cercano al tiempo especificado
    for (let i = 0; i < dataPoints.length - 1; i++) {
        if (dataPoints[i].t <= time && dataPoints[i+1].t >= time) {
            // Interpolación lineal entre los dos puntos más cercanos
            const t1 = dataPoints[i].t;
            const t2 = dataPoints[i+1].t;
            const y1 = dataPoints[i].y;
            const y2 = dataPoints[i+1].y;
            
            return y1 + (y2 - y1) * (time - t1) / (t2 - t1);
        }
    }
    
    // Si está fuera del rango, devolver el valor del punto final
    if (dataPoints.length > 0 && time > dataPoints[dataPoints.length-1].t) {
        return dataPoints[dataPoints.length-1].y;
    }
    
    return defaultValue;
} 