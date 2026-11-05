package com.gastroguide.document.signature;

/** O PDF anexado não serve; a mensagem vai para o médico como está. */
public class InvalidSignedPdfException extends RuntimeException {
    public InvalidSignedPdfException(String message) {
        super(message);
    }
}
