import { redirect } from "next/navigation";

export default function Home() {
  // 루트는 게시판으로 고정
  redirect("/posts");
}
