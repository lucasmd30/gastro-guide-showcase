package com.gastroguide.document.signature;

/**
 * Nível da assinatura, nos termos da Lei 14.063/2020: qualificada é a feita
 * com certificado ICP-Brasil (VIDaaS, BirdID, SafeID, RemoteID, NeoID, token
 * A1/A3); avançada é a do gov.br. Atestado e receita de controle especial só
 * valem com a qualificada (art. 13).
 */
public enum SignatureLevel {
    ICP_BRASIL,
    GOV_BR,
    OUTRA
}
