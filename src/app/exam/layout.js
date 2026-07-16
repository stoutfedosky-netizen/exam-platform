import { ExamProvider } from "@/context/ExamContext";

export default function ExamLayout({ children }) {
  return <ExamProvider>{children}</ExamProvider>;
}
