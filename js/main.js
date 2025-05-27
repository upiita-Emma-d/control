// js/main.js

/**
 * Funciones de inicialización y manejo de eventos para la aplicación interactiva
 * ------------------------------------------------------------------------------
 * Este archivo contiene código para inicializar la aplicación, mostrar parámetros iniciales,
 * y manejar la lógica de eventos cuando el usuario interactúa con los controles.
 */

// Función que se ejecuta cuando el DOM está completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log("Aplicación interactiva cargada. Inicializando...");
    
    // Mostrar parámetros calculados en la interfaz
    document.getElementById('p2_keff_val').textContent = K_eff_motor.toFixed(3);
    document.getElementById('p2_wnom_val').textContent = omega_nom_rad_s.toFixed(2);
    document.getElementById('p2_tl_spec_val').textContent = T_L_spec.toFixed(2);
    
    // Calcular y mostrar las funciones de transferencia iniciales
    calculateProblem2b();
    
    // Registrar que la aplicación está lista en consola (para depuración)
    console.log("Parámetros del sistema:");
    console.log(`K_eff_motor: ${K_eff_motor.toFixed(3)} V/(rad/s) o Nm/A`);
    console.log(`omega_nom_rad_s: ${omega_nom_rad_s.toFixed(2)} rad/s`);
    console.log(`T_L_spec: ${T_L_spec.toFixed(2)} Nm`);
    console.log(`Coeficientes FT disponibles: ${Object.keys(p2b_coeffs).length > 0 ? 'Sí' : 'No'}`);
    
    // Informar al usuario que puede comenzar a interactuar
    console.log("✅ Aplicación lista para interactuar. Puede usar los botones para realizar cálculos y simulaciones.");
});

/**
 * Extensiones y utilidades adicionales
 * ------------------------------------
 */

// Función para limpiar y formatear la salida numérica
function formatNumber(value, decimals = 3) {
    if (typeof value !== 'number') return 'N/A';
    return Number(value.toFixed(decimals)).toString();
}

// Función para verificar si MathJax está cargado y disponible
function checkMathJaxLoaded() {
    if (typeof MathJax === 'undefined') {
        console.warn("⚠️ MathJax no está cargado. Las ecuaciones pueden no renderizarse correctamente.");
        return false;
    }
    return true;
}

// Función utilitaria para mostrar mensajes importantes en la consola
function logSystemMessage(message, type = 'info') {
    const styles = {
        info: 'color: #0066cc; font-weight: bold;',
        warning: 'color: #ff9900; font-weight: bold;',
        error: 'color: #cc0000; font-weight: bold;',
        success: 'color: #00cc66; font-weight: bold;'
    };
    
    console.log(`%c${message}`, styles[type] || styles.info);
}

// Console log for debugging
console.log("Motor Control Interactive Exam - Loaded");
console.log("System Parameters:", {
    P_nom,
    K2_p2,
    K1,
    J_motor,
    Ra_motor,
    La_motor,
    Kv_motor: Kv_motor_enunciado,
    If_motor,
    K_eff_motor,
    omega_nom_rad_s,
    T_L_spec
});

// Additional helper functions could be added here if needed 