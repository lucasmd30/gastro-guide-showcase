package com.gastroguide.doctor;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "doctors")
public class Doctor {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, unique = true, length = 200)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(length = 40)
    private String phone;

    /**
     * Quanto dura cada tipo de atendimento, em minutos. É daqui que sai o
     * tamanho de cada horário da grade — a faixa de disponibilidade só diz
     * quando o consultório abre. Vale para todos os agendamentos até o
     * médico mudar (mesmo modelo do catálogo de serviços da Doctoralia e
     * dos procedimentos do iClinic).
     */
    @Column(name = "first_visit_minutes", nullable = false)
    private int firstVisitMinutes = 30;

    @Column(name = "follow_up_minutes", nullable = false)
    private int followUpMinutes = 15;

    /**
     * Valor padrão, em centavos, da consulta e do retorno particulares (V25).
     * Todo agendamento particular nasce com ele e pode ser ajustado um a um.
     * Nulo = sem valor padrão.
     */
    @Column(name = "first_visit_price_cents")
    private Integer firstVisitPriceCents;

    @Column(name = "follow_up_price_cents")
    private Integer followUpPriceCents;

    /** Endereço comercial (V30), impresso no cabeçalho dos documentos. Tudo opcional. */
    @Column(name = "office_cep", length = 8)
    private String officeCep;

    @Column(name = "office_street", length = 200)
    private String officeStreet;

    @Column(name = "office_number", length = 20)
    private String officeNumber;

    @Column(name = "office_complement", length = 100)
    private String officeComplement;

    @Column(name = "office_district", length = 120)
    private String officeDistrict;

    @Column(name = "office_city", length = 120)
    private String officeCity;

    @Column(name = "office_state", length = 2)
    private String officeState;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Doctor() {
    }

    public Doctor(String name, String email, String passwordHash, String phone) {
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.phone = phone;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getOfficeCep() {
        return officeCep;
    }

    public String getOfficeStreet() {
        return officeStreet;
    }

    public String getOfficeNumber() {
        return officeNumber;
    }

    public String getOfficeComplement() {
        return officeComplement;
    }

    public String getOfficeDistrict() {
        return officeDistrict;
    }

    public String getOfficeCity() {
        return officeCity;
    }

    public String getOfficeState() {
        return officeState;
    }

    public void setOfficeAddress(String cep, String street, String number, String complement,
                                 String district, String city, String state) {
        this.officeCep = cep;
        this.officeStreet = street;
        this.officeNumber = number;
        this.officeComplement = complement;
        this.officeDistrict = district;
        this.officeCity = city;
        this.officeState = state;
    }

    public int getFirstVisitMinutes() {
        return firstVisitMinutes;
    }

    public void setFirstVisitMinutes(int firstVisitMinutes) {
        this.firstVisitMinutes = firstVisitMinutes;
    }

    public int getFollowUpMinutes() {
        return followUpMinutes;
    }

    public void setFollowUpMinutes(int followUpMinutes) {
        this.followUpMinutes = followUpMinutes;
    }

    public Integer getFirstVisitPriceCents() {
        return firstVisitPriceCents;
    }

    public void setFirstVisitPriceCents(Integer firstVisitPriceCents) {
        this.firstVisitPriceCents = firstVisitPriceCents;
    }

    public Integer getFollowUpPriceCents() {
        return followUpPriceCents;
    }

    public void setFollowUpPriceCents(Integer followUpPriceCents) {
        this.followUpPriceCents = followUpPriceCents;
    }

    /** O valor padrão do particular para esse tipo de atendimento (nulo = sem padrão). */
    public Integer priceFor(com.gastroguide.appointment.AppointmentType type) {
        return type == com.gastroguide.appointment.AppointmentType.RETORNO ? followUpPriceCents : firstVisitPriceCents;
    }

    /** A duração configurada para esse tipo de atendimento. */
    public int minutesFor(com.gastroguide.appointment.AppointmentType type) {
        return type == com.gastroguide.appointment.AppointmentType.RETORNO ? followUpMinutes : firstVisitMinutes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
