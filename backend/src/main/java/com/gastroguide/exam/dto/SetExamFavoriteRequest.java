package com.gastroguide.exam.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code favorite} falso tira a estrela; repetir o mesmo pedido não muda nada. */
public record SetExamFavoriteRequest(@NotBlank @Size(max = 100) String name, boolean favorite) {
}
