// js/constants.js

/**
 * Constantes y parámetros para los problemas de control de motores
 * ------------------------------------------------------------------
 * Este archivo contiene todos los parámetros del sistema para los
 * problemas de control, organizados.
 */

// PARÁMETROS DEL MOTOR (Problema 2 y 3)
export const MOTOR_PARAMS = {
    P_nom: 15000,                   // Potencia nominal (W)
    V_nom: 230,                     // Voltaje nominal (V)
    N_nom_rpm: 3000,                // Velocidad nominal (rpm)
    J: 0.156,                 // Momento de inercia (N·m·s²/rad) - Corregido J_motor a J
    Ra: 0.045,                // Resistencia de armadura (Ω) - Corregido Ra_motor a Ra
    La: 0.730,                // Inductancia de armadura (H) - Corregido La_motor a La
    Kv_enunciado: 0.542,      // Constante de voltaje Kv del enunciado (V/(A·rad/s)) - Corregido Kv_motor_enunciado
    If: 1.25,                 // Corriente de campo (A) - Corregido If_motor a If
    B: 0                      // Fricción viscosa (N·m·s/rad) - Asumida despreciable
};

// PARÁMETROS DE CONTROL (Problema 2 y 3)
export const CONTROL_PARAMS = {
    K2: 150,                     // Ganancia del convertidor (Problema 2) - Corregido K2_p2 a K2
    K1: 0.004                     // Ganancia del sensor de velocidad (V/rad/s)
};

// VALORES CALCULADOS (Derivados de los parámetros anteriores)
export const CALCULATED_VALUES = {
    Keff: MOTOR_PARAMS.Kv_enunciado * MOTOR_PARAMS.If,  // Constante efectiva del motor (V/rad/s o Nm/A)
    omega_nom_rad_s: MOTOR_PARAMS.N_nom_rpm * 2 * Math.PI / 60,  // Velocidad nominal (rad/s)
    TL_spec: MOTOR_PARAMS.P_nom / (MOTOR_PARAMS.N_nom_rpm * 2 * Math.PI / 60)  // Par de carga nominal (Nm)
};

// Coeficientes para funciones de transferencia (Problema 2b)
// Este objeto es para almacenar estado entre cálculos, no es una constante fundamental.
// Podría ser gestionado dentro de calculations.js si es específico de ese módulo.
export const p2b_coeffs = {}; // Se mantiene exportado por si se usa globalmente en index.html directamente


// PARÁMETROS DEL PROBLEMA 1 (Referencia, no usados en scripts interactivos actuales de P2/P3)
export const P1_PARAMS = {
    P_nom: 20 * 746,                  // Potencia nominal (W) (convertido de 20 HP)
    V_nom: 300,                       // Voltaje nominal (V)
    N_nom_rpm: 900,                   // Velocidad nominal (rpm)
    Ra: 0.15,                         // Resistencia de armadura (Ω)
    Rf: 145,                          // Resistencia de campo (Ω)
    Kv: 1.15,                         // Constante de voltaje (V/(A·rad/s))
    V_LL: 440,                        // Voltaje línea-línea de alimentación AC (V)
    freq: 60                          // Frecuencia (Hz)
};

// PARÁMETROS DEL PROBLEMA 3 (Adicionales)
export const P3_PARAMS = {
    K1_sensor: CONTROL_PARAMS.K1,      // Ganancia del sensor de velocidad (igual que en prob. 2)
    SR_desired: 0.005                  // Regulación de velocidad deseada (0.5%)
};

// CONSTANTES MATEMÁTICAS ÚTILES
export const MATH_CONSTANTS = {
    PI: Math.PI,
    HP_TO_WATTS: 746,                  // Factor de conversión HP a Watts
    RPM_TO_RAD_S: 2 * Math.PI / 60     // Factor de conversión rpm a rad/s
}; 