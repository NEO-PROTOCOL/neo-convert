import ContentPage from "@/components/ContentPage";

export default function SegurancaPage() {
  return (
    <ContentPage
      eyebrow="Segurança"
      title="Segurança operacional"
      description="Segurança útil é disciplina de fronteira: o que roda no cliente, o que sobe para o servidor, o que expira e o que jamais deve vazar."
      color="#00ff9d"
      updatedAt="7 de março de 2026"
      sections={[
        {
          title: "Processamento local quando possível",
          paragraphs: [
            "Ferramentas como compressão, divisão e combinação de PDFs priorizam execução no navegador para reduzir exposição desnecessária do arquivo.",
            "Isso diminui superfície de risco, encurta latência e preserva controle do usuário sobre o documento durante a operação. O melhor upload sensível continua sendo o que não precisou acontecer.",
          ],
        },
        {
          title: "Camada protegida de servidor",
          paragraphs: [
            "A camada server-side é usada apenas onde segredo de infraestrutura realmente importa, como criação de cobrança, verificação de status, envio de email, emissão de token e upload temporário sob autorização.",
            "Chaves de pagamento, credenciais de integração e validações sensíveis permanecem fora do cliente. O front não recebe o que não precisa saber, nem o usuário precisa ver qual provedor está atrás de cada etapa.",
          ],
        },
        {
          title: "Controles adicionais",
          paragraphs: [
            "Aplicamos checagem de origem, rate limiting, sanitização de entrada, validação de token e restrições de tipo e tamanho de arquivo nos fluxos mais sensíveis.",
            "Links seguros e autorizações de download têm vida útil limitada. Persistência eterna é confortável para o atacante, nunca para o produto.",
          ],
        },
        {
          title: "Continuidade operacional",
          paragraphs: [
            "Segurança não é apenas impedir acesso indevido. É também garantir previsibilidade, recuperação e evolução sem colapso operacional a cada mudança.",
            <>
              Se você identificar comportamento suspeito, falha de acesso ou
              possível vulnerabilidade, reporte para{" "}
              <a
                href="mailto:neo@neoprotocol.space"
                style={{ color: "var(--neo-green)", textDecoration: "none" }}
              >
                neo@neoprotocol.space
              </a>
              .
            </>,
          ],
        },
      ]}
    />
  );
}
