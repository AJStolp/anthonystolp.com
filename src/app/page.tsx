import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { NameReveal } from "@/components/NameReveal";
import { Approach } from "@/components/Approach";
import { LeadForm } from "@/components/LeadForm";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative w-full overflow-x-hidden">
      <Nav />
      <Hero />
      <NameReveal />
      <Approach />
      <LeadForm />
      <Footer />
    </main>
  );
}
