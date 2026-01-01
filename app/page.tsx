import { MainLayout } from "@/components/layout/main-layout";
import { ResultsPanel } from "@/components/results/results-panel";
import { YearTable } from "@/components/results/year-table/year-table";
import { ScenarioPanel } from "@/components/scenario/scenario-panel";

export default function Page() {
  return (
    <MainLayout>
      <div className="space-y-6 px-6 py-4">
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,720px)_1fr]">
          <aside className="space-y-4">
            <div className="columns-1 md:columns-2 [column-gap:1rem]">
              <ScenarioPanel className="contents" />
            </div>
          </aside>
          <main>
            <ResultsPanel />
          </main>
        </div>
        <YearTable />
      </div>
    </MainLayout>
  );
}
