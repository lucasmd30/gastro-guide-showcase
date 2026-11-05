package com.gastroguide.medicalrecord;

import com.gastroguide.medicalrecord.dto.DiseaseSummaryDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/doencas")
public class DiseaseController {

    @GetMapping
    public List<DiseaseSummaryDto> list() {
        // Ordem dos cards de "Prontuários modelo": os modelos gerais que a
        // cliente usa todo dia vêm primeiro (displayOrder), o resto em ordem
        // alfabética.
        // Modelo aposentado some dos cards, mas `config` continua servindo
        // o slug para os registros antigos que apontam para ele.
        return DiseaseRegistry.ALL.values().stream()
                .filter(definition -> !definition.retired())
                .sorted(Comparator.comparingInt(DiseaseDefinition::displayOrder)
                        .thenComparing(DiseaseDefinition::title))
                .map(DiseaseSummaryDto::from)
                .toList();
    }

    @GetMapping("/{slug}/config")
    public DiseaseDefinition config(@PathVariable String slug) {
        return DiseaseRegistry.getOrThrow(slug);
    }
}
