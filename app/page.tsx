"use client";

import { useEffect, useState } from "react";

type Exercise = [string, number, number, number];
type PlanDay = {
  n: string;
  d: string;
  e: Exercise[];
};
type LogEntry = {
  d: string;
  l: number;
  r: number[];
};

const PLAN: PlanDay[] = [
  {
    n: "Superior A",
    d: "Segunda",
    e: [
      ["Supino reto na máquina", 3, 6, 10],
      ["Puxada alta", 3, 8, 12],
      ["Desenvolvimento de ombros na máquina", 3, 8, 12],
      ["Remada baixa com triângulo", 3, 8, 12],
      ["Elevação lateral na polia", 4, 12, 15],
      ["Tríceps na polia com barra", 3, 10, 12],
      ["Rosca Scott na máquina", 3, 10, 12],
    ],
  },
  {
    n: "Inferior A",
    d: "Terça",
    e: [
      ["Leg press 90°", 4, 8, 12],
      ["Mesa flexora", 3, 10, 12],
      ["Cadeira extensora", 3, 10, 15],
      ["Gêmeos sentado", 3, 10, 15],
      ["Elevação lateral na polia", 4, 12, 15],
      ["Crucifixo inverso (peck deck reverso)", 3, 12, 15],
    ],
  },
  {
    n: "Superior B",
    d: "Quarta",
    e: [
      ["Remada cavalinho", 4, 8, 10],
      ["Supino inclinado na máquina", 3, 8, 12],
      ["Crucifixo (peck deck)", 3, 10, 15],
      ["Tríceps acima da cabeça na polia", 3, 10, 12],
      ["Rosca direta na polia baixa", 3, 10, 12],
    ],
  },
  {
    n: "Inferior B",
    d: "Quinta",
    e: [
      ["Stiff / terra romeno", 3, 8, 10],
      ["Leg press (pés mais altos)", 3, 10, 12],
      ["Cadeira flexora", 3, 10, 15],
      ["Cadeira extensora", 2, 12, 15],
      ["Gêmeos sentado", 3, 10, 15],
    ],
  },
];

const CICLO = [
  [
    "Calibração: ache a carga de cada exercício e anote. Exercícios novos começam leves; pernas com 1 série a menos.",
    "3",
  ],
  ["Mesma carga, busque +1-2 repetições por série.", "2-3"],
  ["Quem atingir o topo da faixa em todas as séries sobe a carga.", "2"],
  ["Continue a dupla progressão; pernas já no volume total.", "1-2"],
  ["Continue a dupla progressão.", "1-2"],
  ["Última série dos compostos mais perto da falha; isoladores com 0-1.", "1"],
  ["Semana de pico: tente bater recordes de carga ou repetições.", "1"],
  ["Descarga (opcional): mesmas cargas, metade das séries, longe da falha.", "3-4"],
];

const getSuggestion = (targetSets: number, base: number, reps: number[]) => {
  if (reps.length === 0) {
    return { tone: "", text: "" };
  }

  const hasTopRange = reps.length >= targetSets && Math.min(...reps) >= base;

  return hasTopRange
    ? { tone: "up", text: "Subir carga no próximo treino" }
    : { tone: "keep", text: "Manter carga" };
};

const STORAGE_KEY = "meu-treino-state-v1";
const hoje = () => new Date().toLocaleDateString("pt-BR");

export default function Home() {
  const [tab, setTab] = useState(0);
  const [day, setDay] = useState(0);
  const [week, setWeek] = useState(1);
  const [logs, setLogs] = useState<Record<string, LogEntry[]>>({});
  const [openExercise, setOpenExercise] = useState<string>("");
  const [exerciseInputs, setExerciseInputs] = useState<
    Record<string, { load: string; reps: string[] }>
  >({});
  const [saveMessages, setSaveMessages] = useState<Record<string, string>>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const rawState = window.localStorage.getItem(STORAGE_KEY);
      const defaultDay =
        new Date().getDay() >= 1 && new Date().getDay() <= 4
          ? new Date().getDay() - 1
          : 0;

      if (rawState) {
        const saved = JSON.parse(rawState) as {
          tab?: number;
          day?: number;
          week?: number;
          logs?: Record<string, LogEntry[]>;
          openExercise?: string;
          exerciseInputs?: Record<string, { load: string; reps: string[] }>;
          saveMessages?: Record<string, string>;
        };

        setTab(Number.isFinite(saved.tab) ? Number(saved.tab) : 0);
        setDay(Number.isFinite(saved.day) ? Number(saved.day) : defaultDay);
        setWeek(Number.isFinite(saved.week) && Number(saved.week) >= 1 ? Number(saved.week) : 1);
        setLogs(saved.logs ?? {});
        setOpenExercise(saved.openExercise ?? "");
        setExerciseInputs(saved.exerciseInputs ?? {});
        setSaveMessages(saved.saveMessages ?? {});
      } else {
        setDay(defaultDay);
      }
    } catch {
      const defaultDay =
        new Date().getDay() >= 1 && new Date().getDay() <= 4
          ? new Date().getDay() - 1
          : 0;

      setDay(defaultDay);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady || typeof window === "undefined") {
      return;
    }

    const state = {
      tab,
      day,
      week,
      logs,
      openExercise,
      exerciseInputs,
      saveMessages,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [tab, day, week, logs, openExercise, exerciseInputs, saveMessages, isReady]);

  const currentPlan = PLAN[day] ?? PLAN[0];

  const updateLoad = (exerciseKey: string, value: string) => {
    setExerciseInputs((current) => ({
      ...current,
      [exerciseKey]: {
        load: value,
        reps: current[exerciseKey]?.reps ?? [],
      },
    }));
  };

  const updateRep = (exerciseKey: string, index: number, value: string) => {
    setExerciseInputs((current) => {
      const previous = current[exerciseKey] ?? { load: "", reps: [] };
      const reps = [...previous.reps];
      reps[index] = value;

      return {
        ...current,
        [exerciseKey]: {
          load: previous.load,
          reps,
        },
      };
    });
  };

  const handleSave = (exerciseKey: string, targetSets: number, max: number) => {
    const item = exerciseInputs[exerciseKey] ?? { load: "", reps: [] };
    const load = Number(item.load);
    const reps = item.reps
      .map((value) => Number(value))
      .filter((value) => !Number.isNaN(value));

    if (Number.isNaN(load) || reps.length === 0) {
      setSaveMessages((current) => ({
        ...current,
        [exerciseKey]: "Digite a carga e pelo menos uma série.",
      }));
      return;
    }

    const existing = logs[exerciseKey] ?? [];
    const nextLogs = [...existing, { d: hoje(), l: load, r: reps }];

    setLogs((current) => ({
      ...current,
      [exerciseKey]: nextLogs,
    }));

    setSaveMessages((current) => ({
      ...current,
      [exerciseKey]: "",
    }));

    setOpenExercise(exerciseKey);

    const suggestion = getSuggestion(targetSets, max, reps);
    setExerciseInputs((current) => ({
      ...current,
      [exerciseKey]: {
        load: "",
        reps: Array.from({ length: targetSets }, () => ""),
      },
    }));

    if (suggestion.text) {
      setSaveMessages((current) => ({
        ...current,
        [exerciseKey]: suggestion.text,
      }));
    }
  };

  const renderTreino = () => (
    <>
      <h1>{currentPlan.n}</h1>
      <div className="chips">
        {PLAN.map((plan, index) => (
          <button
            type="button"
            key={plan.n}
            className={`chip ${index === day ? "on" : ""}`}
            onClick={() => {
              setDay(index);
              setOpenExercise("");
            }}
          >
            {plan.d.slice(0, 3)}
            <small>{plan.n}</small>
          </button>
        ))}
      </div>

      <div className="wk">
        <span>
          Semana <b>{week}</b>
        </span>
        <span className="mut">
          RIR alvo <b style={{ color: "var(--tx)" }}>{CICLO[week - 1]?.[1] ?? "-"}</b>
        </span>
      </div>

      {currentPlan.e.map(([name, sets, min, max], index) => {
        const exerciseKey = `${currentPlan.n}|${index + 1}`;
        const lastLog = logs[exerciseKey]?.[logs[exerciseKey].length - 1];
        const currentInput = exerciseInputs[exerciseKey] ?? {
          load: lastLog ? String(lastLog.l) : "",
          reps: Array.from({ length: sets }, () => ""),
        };
        const repValues = currentInput.reps.map((value) => Number(value)).filter((value) => !Number.isNaN(value));
        const suggestion = getSuggestion(sets, max, repValues);
        const message = saveMessages[exerciseKey] ?? suggestion.text;

        return (
          <details key={exerciseKey} open={openExercise === exerciseKey}>
            <summary
              onClick={(event) => {
                event.preventDefault();
                setOpenExercise((current) => (current === exerciseKey ? "" : exerciseKey));
              }}
            >
              <b>
                {index + 1}. {name}
              </b>
              <span>
                {sets}×{min}-{max}
              </span>
              {lastLog ? (
                <em>
                  Último: {lastLog.d} · {lastLog.l} kg × {lastLog.r.join("/")}
                </em>
              ) : (
                <em>Sem registro ainda</em>
              )}
            </summary>

            <div className="body">
              <label>
                Carga (kg)
                <input
                  className="ld"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  value={currentInput.load}
                  onChange={(event) => updateLoad(exerciseKey, event.target.value)}
                />
              </label>

              <div className="reps">
                {Array.from({ length: sets }, (_, repIndex) => (
                  <label key={`${exerciseKey}-${repIndex}`}>
                    Série {repIndex + 1}
                    <input
                      className="rp"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      placeholder={String(max)}
                      value={currentInput.reps[repIndex] ?? ""}
                      onChange={(event) => updateRep(exerciseKey, repIndex, event.target.value)}
                    />
                  </label>
                ))}
              </div>

              {message ? (
                <p className={`sug ${suggestion.tone || ""}`}>{message}</p>
              ) : null}

              <button
                type="button"
                className="save"
                onClick={() => handleSave(exerciseKey, sets, max)}
              >
                Salvar registro
              </button>
            </div>
          </details>
        );
      })}

      <p className="mut">Seus registros ficam salvos neste aparelho.</p>
    </>
  );

  const renderCiclo = () => (
    <>
      <h1>Ciclo de 8 semanas</h1>
      <p className="mut">
        Toque numa semana para marcá-la como a atual. RIR é quantas repetições ainda sobrariam no
        fim da série.
      </p>
      {CICLO.map(([text, rir], index) => (
        <button
          type="button"
          key={text}
          className={`card wkc ${index + 1 === week ? "on" : ""}`}
          onClick={() => setWeek(index + 1)}
        >
          <i>{index + 1}</i>
          <span>{text}</span>
          <u>RIR {rir}</u>
        </button>
      ))}

      <h2>Como subir a carga</h2>
      <div className="card">
        <p>
          Mantenha a carga e busque mais repetições. Quando completar o topo da faixa em todas as
          séries, com boa técnica, suba a carga (2-5% nos braços e ombros, 5-10% nas pernas) e volte
          ao piso da faixa.
        </p>
        <p className="mut">Descanse 2-3 min nos compostos e 1-2 min nos isoladores.</p>
      </div>
    </>
  );

  const renderProgresso = () => {
    let totalExercicios = 0;

    const cards = PLAN.flatMap((plan) =>
      plan.e.map((exercise, index) => {
        const key = `${plan.n}|${index + 1}`;
        const entries = logs[key];

        if (!entries || entries.length === 0) {
          return null;
        }

        totalExercicios += 1;
        const initial = entries[0].l;
        const current = entries[entries.length - 1].l;
        const max = Math.max(...entries.map((entry) => entry.l));
        const variation = current - initial;

        return (
          <div className="card" key={key}>
            <b>{exercise[0]}</b>
            <div className="mut">
              {plan.n} · {entries.length} registro{entries.length > 1 ? "s" : ""}
            </div>
            <div className="pg">
              <div>
                <small>Inicial</small>
                <b>{initial}</b>
              </div>
              <div>
                <small>Atual</small>
                <b>{current}</b>
              </div>
              <div>
                <small>Máxima</small>
                <b>{max}</b>
              </div>
            </div>
            <p className="mut">
              Variação: <span className={variation > 0 ? "pos" : ""}>{variation > 0 ? "+" : ""}{variation} kg</span>
            </p>
          </div>
        );
      })
    );

    return (
      <>
        <h1>Progresso</h1>
        {cards.length > 0 ? cards : <p>Nenhum registro ainda. Abra a aba Treino, escolha um exercício e salve a carga e as repetições.</p>}
      </>
    );
  };

  return (
    <>
      <main id="app" className="app-shell">
        {tab === 0 ? renderTreino() : tab === 1 ? renderCiclo() : renderProgresso()}
      </main>

      <nav>
        <button type="button" className={tab === 0 ? "on" : ""} onClick={() => setTab(0)}>
          Treino
        </button>
        <button type="button" className={tab === 1 ? "on" : ""} onClick={() => setTab(1)}>
          Ciclo
        </button>
        <button type="button" className={tab === 2 ? "on" : ""} onClick={() => setTab(2)}>
          Progresso
        </button>
      </nav>

    </>
  );
}
