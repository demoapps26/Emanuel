/** Integration boundary: local world coordinates must never be treated as latitude/longitude. */
export function mapReadiness({
  mode = "local",
  coordinatesValidated = false,
  providerImplemented = true,
  keyPresent = false,
  requestsEnabled = false,
} = {}) {
  if (mode === "local")
    return {
      mode: "local",
      reason:
        "Modo local ativo. Faltam coordenadas validadas e uma integração autorizada. Nenhum serviço Google é carregado e não são efetuadas chamadas pagas.",
    };
  const missing = [];
  if (!coordinatesValidated) missing.push("coordenadas e acessos validados");
  if (!providerImplemented)
    missing.push("fornecedor implementado e termos/custos revistos");
  if (!keyPresent) missing.push("chave configurada e restringida");
  if (!requestsEnabled)
    missing.push("ativação explícita após revisão de custos");
  if (!missing.length)
    return {
      mode: "google",
      reason:
        "Configuração presente; ligação, cobertura e precisão ainda precisam de validação com o fornecedor.",
    };
  return {
    mode: "local",
    reason: `Integração real indisponível: ${missing.join("; ") || "ativação ainda não autorizada"}. Mantém-se a demonstração local; nenhuma chamada paga foi feita.`,
  };
}
