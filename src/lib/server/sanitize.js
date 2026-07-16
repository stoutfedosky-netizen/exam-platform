// THE MOAT: strip correct answer + explanations before anything goes to the client.
// Pure module (no Next.js imports) so it stays unit-testable in plain node.
export function sanitizeQuestion(row) {
  const { correct_answer, explanations, ...safe } = row;
  return safe;
}
