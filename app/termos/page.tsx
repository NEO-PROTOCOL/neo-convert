import ContentPage from "@/components/ContentPage";

export default function TermosPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Termos de Uso"
      description="Usar o NeoConvert significa aceitar regras simples: uso legítimo, responsabilidade sobre o conteúdo enviado e respeito aos limites do serviço."
      color="#ff6b35"
      updatedAt="7 de março de 2026"
      sections={[
        {
          title: "Uso permitido",
          paragraphs: [
            "Você pode usar a plataforma para operações legítimas de conversão, edição, preparação e automação documental dentro dos limites expostos no produto.",
            "Não é permitido usar o serviço para fraude, distribuição ilícita, abuso automatizado, engenharia hostil, violação de direitos de terceiros ou qualquer uso que degrade infraestrutura, segurança ou conformidade. Se isso ocorrer, o acesso pode ser limitado, suspenso ou bloqueado.",
          ],
        },
        {
          title: "Responsabilidade do conteúdo",
          paragraphs: [
            "Você continua responsável pelos arquivos, dados, permissões e direitos associados ao material processado no serviço.",
            "O NeoConvert oferece infraestrutura e automação. Não certifica licitude do conteúdo, autenticidade documental ou adequação regulatória específica, nem substitui revisão jurídica, contábil ou técnica quando ela for necessária.",
          ],
        },
        {
          title: "Pagamentos, franquias e disponibilidade",
          paragraphs: [
            "Ferramentas, downloads ou extensões de uso sujeitos a cobrança deixam a condição comercial visível no fluxo. Quando houver franquia gratuita, ela segue os limites expostos na própria interface.",
            "Autorizações liberadas após pagamento são temporárias e podem ficar vinculadas ao dispositivo, sessão ou token operacional conforme o fluxo aplicável.",
            "Solicitações de cancelamento, revisão comercial, contestação de cobrança ou análise de reembolso devem ser enviadas para neo@neoprotocol.space. Cada caso é avaliado conforme natureza digital da entrega, estágio de consumo do serviço e obrigações aplicáveis.",
            "Buscamos alta disponibilidade, mas o serviço pode passar por manutenção, atualização, limitação temporária ou indisponibilidade parcial sem aviso prévio em situações operacionais urgentes.",
          ],
        },
        {
          title: "Evolução e contato",
          paragraphs: [
            "O produto pode evoluir em interface, regras de uso, integrações e arquitetura sem obrigação de preservar fluxos antigos quando isso comprometer segurança, clareza ou continuidade operacional.",
            <>
              Dúvidas institucionais ou solicitações relacionadas a estes termos
              podem ser enviadas para{" "}
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
