package com.gastroguide.appointment;

public enum AppointmentStatus {
    AGENDADO, CONFIRMADO, ATENDIDO, FALTOU, CANCELADO;

    /**
     * Se o agendamento ainda segura o horário. Cancelado e falta liberam: o
     * paciente que faltou continua registrado como falta, mas o médico pode
     * adiantar outro paciente para aquele horário (pedido de 10/10/2026 —
     * antes só o cancelado liberava, e "Faltou" travava a remarcação).
     * Mesma regra do índice parcial da V24.
     */
    public boolean occupiesSlot() {
        return this != CANCELADO && this != FALTOU;
    }
}
