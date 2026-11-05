package com.gastroguide.patient;

import com.gastroguide.doctor.Doctor;
import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "patients")
public class Patient {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 11)
    private String cpf;

    @Column(length = 40)
    private String phone;

    @Column(length = 40)
    private String phone2;

    @Column(length = 200)
    private String email;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(length = 160)
    private String birthplace;

    @Column(length = 160)
    private String origin;

    @Column(length = 500)
    private String address;

    @Column(name = "mother_name", length = 200)
    private String motherName;

    // Identificação que antes era preenchida no cabeçalho da consulta de
    // hepatologia: virou cadastro, para não ser redigitada a cada
    // atendimento (pedido da cliente).
    @Column(length = 20)
    private String sex;

    @Column(length = 160)
    private String profession;

    @Column(name = "marital_status", length = 60)
    private String maritalStatus;

    @Column(length = 80)
    private String religion;

    @Column(name = "continuous_medications", columnDefinition = "text")
    private String continuousMedications;

    @Column(columnDefinition = "text")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Patient() {
    }

    public Patient(Doctor doctor, String name) {
        this.doctor = doctor;
        this.name = name;
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

    public Doctor getDoctor() {
        return doctor;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPhone2() {
        return phone2;
    }

    public void setPhone2(String phone2) {
        this.phone2 = phone2;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(LocalDate birthDate) {
        this.birthDate = birthDate;
    }

    public String getBirthplace() {
        return birthplace;
    }

    public void setBirthplace(String birthplace) {
        this.birthplace = birthplace;
    }

    public String getOrigin() {
        return origin;
    }

    public void setOrigin(String origin) {
        this.origin = origin;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getMotherName() {
        return motherName;
    }

    public String getSex() {
        return sex;
    }

    public void setSex(String sex) {
        this.sex = sex;
    }

    public String getProfession() {
        return profession;
    }

    public void setProfession(String profession) {
        this.profession = profession;
    }

    public String getMaritalStatus() {
        return maritalStatus;
    }

    public void setMaritalStatus(String maritalStatus) {
        this.maritalStatus = maritalStatus;
    }

    public String getReligion() {
        return religion;
    }

    public void setReligion(String religion) {
        this.religion = religion;
    }

    public void setMotherName(String motherName) {
        this.motherName = motherName;
    }

    public String getContinuousMedications() {
        return continuousMedications;
    }

    public void setContinuousMedications(String continuousMedications) {
        this.continuousMedications = continuousMedications;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
