package com.gastroguide.document;

import com.gastroguide.doctor.Doctor;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Texto que o médico salva para reusar em qualquer paciente. Ao contrário do
 * documento emitido, é dele para editar e apagar.
 */
@Entity
@Table(name = "document_templates")
public class DocumentTemplate {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DocumentTemplateKind kind;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected DocumentTemplate() {
    }

    public DocumentTemplate(Doctor doctor, DocumentTemplateKind kind, String name, String content) {
        this.doctor = doctor;
        this.kind = kind;
        this.name = name;
        this.content = content;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public void update(String newName, String newContent) {
        this.name = newName;
        this.content = newContent;
    }

    public UUID getId() {
        return id;
    }

    public DocumentTemplateKind getKind() {
        return kind;
    }

    public String getName() {
        return name;
    }

    public String getContent() {
        return content;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
