import ContentPage from "@/components/ContentPage";

export default function ContatoPage() {
  return (
    <ContentPage
      eyebrow="Contato"
      title="Fale com o NeoConvert"
      description="Se algo falhou, travou ou simplesmente ficou ambíguo, o contato precisa ser tão direto quanto o produto."
      color="#0ea5e9"
      updatedAt="7 de março de 2026"
      sections={[
        {
          title: "Suporte",
          paragraphs: [
            <>
              Para ajuda operacional, pagamentos, recuperação de acesso ou
              qualquer contato direto, envie um email para{" "}
              <a
                href="mailto:neo@neoprotocol.space"
                style={{ color: "var(--neo-green)", textDecoration: "none" }}
              >
                neo@neoprotocol.space
              </a>
              .
            </>,
            "Quando possível, inclua a ferramenta usada, horário aproximado, email informado no checkout e o comportamento esperado. Diagnóstico sem contexto é só adivinhação cara.",
          ],
        },
        {
          title: "Contato institucional",
          paragraphs: [
            "Parcerias, licenciamento, uso corporativo, integrações ou demandas de maior escala também passam por esse mesmo canal.",
            "Se o tema envolver volume, equipe, operação recorrente ou revenda, diga isso no primeiro email. O desenho da resposta depende do desenho do problema.",
          ],
        },
        {
          title: "Janela de resposta",
          paragraphs: [
            "Atendimento em dias úteis, com prioridade operacional para assuntos financeiros, acesso bloqueado e falhas em fluxo de pagamento ou download.",
            "A resposta esperada é objetiva: contexto, causa provável e próximo passo. Mensagem bonita sem ação é só atraso com maquiagem.",
          ],
        },
      ]}
    />
  );
}
