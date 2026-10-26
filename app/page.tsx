"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CssBaseline,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material";
import { green } from "@mui/material/colors";
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
    n: "Treino A",
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
    n: "Treino B",
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
    n: "Treino C",
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
    n: "Treino D",
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

const appTheme = createTheme({
  palette: {
    primary: {
      main: green[700],
      light: green[100],
      dark: green[900],
      contrastText: "#fff",
    },
    secondary: {
      main: green[500],
    },
    success: {
      main: green[600],
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

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
    if (
      typeof window === "undefined" ||
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        await registration.update();

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        const applyUpdate = () => {
          if (!registration.waiting) {
            return;
          }

          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        };

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              applyUpdate();
              window.location.reload();
            }
          });
        });

        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) {
            registration.update().catch((error) => {
              console.error("Service worker update failed:", error);
            });
          }
        });
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };

    registerServiceWorker();
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
    <Stack spacing={2}>
      <Typography variant="h5">{currentPlan.n}</Typography>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Tabs
          value={day}
          onChange={(_, nextDay) => {
            setDay(nextDay);
            setOpenExercise("");
          }}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
          sx={{
            width: "100%",
            minWidth: 0,
            ".MuiTabs-flexContainer": {
              width: "100%",
            },
            ".MuiTab-root": {
              flex: 1,
              minWidth: 0,
            },
          }}
        >
          {PLAN.map((plan) => (
            <Tab key={plan.n} label={plan.n.replace("Treino ", "")} />
          ))}
        </Tabs>
      </Paper>

      <Paper variant="outlined">
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Semana
            </Typography>
            <Typography variant="h6">{week}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              RIR alvo
            </Typography>
            <Typography variant="h6">{CICLO[week - 1]?.[1] ?? "-"}</Typography>
          </Box>
        </Stack>
      </Paper>

      <Stack spacing={1.5}>
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
            <Accordion
              key={exerciseKey}
              expanded={openExercise === exerciseKey}
              onChange={() => setOpenExercise((current) => (current === exerciseKey ? "" : exerciseKey))}
              disableGutters
            >
              <AccordionSummary>
                <Stack direction="row" spacing={1} sx={{ width: "100%", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography variant="subtitle1">
                      {index + 1}. {name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {sets} séries · {min}-{max} reps
                    </Typography>
                  </Box>
                  <Chip
                    label={lastLog ? `${lastLog.l} kg` : "kg"}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ minWidth: 72, justifyContent: "center" }}
                  />
                </Stack>
              </AccordionSummary>

              <AccordionDetails>
                <Stack spacing={1.5}>
                  <TextField
                    label="Carga (kg)"
                    type="number"
                    value={currentInput.load}
                    onChange={(event) => updateLoad(exerciseKey, event.target.value)}
                    slotProps={{ htmlInput: { inputMode: "decimal", min: 0, step: 0.5 } }}
                    size="small"
                  />

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 1,
                    }}
                  >
                    {Array.from({ length: sets }, (_, repIndex) => (
                      <TextField
                        key={`${exerciseKey}-${repIndex}`}
                        label={`Série ${repIndex + 1}`}
                        type="number"
                        value={currentInput.reps[repIndex] ?? ""}
                        onChange={(event) => updateRep(exerciseKey, repIndex, event.target.value)}
                        slotProps={{ htmlInput: { inputMode: "numeric", min: 0, placeholder: String(max) } }}
                        size="small"
                      />
                    ))}
                  </Box>

                  {message ? (
                    <Paper variant="outlined">
                      <Typography variant="body2">{message}</Typography>
                    </Paper>
                  ) : null}

                  <Button variant="contained" onClick={() => handleSave(exerciseKey, sets, max)}>
                    Salvar registro
                  </Button>
                </Stack>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Seus registros ficam salvos neste aparelho.
      </Typography>
    </Stack>
  );

  const renderCiclo = () => (
    <Stack spacing={2}>
      <Box>
        <Typography variant="caption" color="text.secondary">
          Progresso
        </Typography>
        <Typography variant="h5">Ciclo de 8 semanas</Typography>
      </Box>

      <Typography variant="body2" color="text.secondary">
        Toque numa semana para marcá-la como a atual. RIR é quantas repetições ainda sobrariam no fim da série.
      </Typography>

      <Stack spacing={1.25}>
        {CICLO.map(([text, rir], index) => (
          <Paper key={text} variant={index + 1 === week ? "elevation" : "outlined"} onClick={() => setWeek(index + 1)}>
            <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <Stack direction="row" spacing={1}>
                <Typography variant="subtitle2">{index + 1}</Typography>
                <Typography variant="body2">{text}</Typography>
              </Stack>
              <Typography variant="caption">RIR {rir}</Typography>
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Como subir a carga</Typography>
          <Typography variant="body2" color="text.secondary">
            Mantenha a carga e busque mais repetições. Quando completar o topo da faixa em todas as séries, com boa técnica, suba a carga (2-5% nos braços e ombros, 5-10% nas pernas) e volte ao piso da faixa.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Descanse 2-3 min nos compostos e 1-2 min nos isoladores.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );

  const renderProgresso = () => {
    const cards = PLAN.flatMap((plan) =>
      plan.e.map((exercise, index) => {
        const key = `${plan.n}|${index + 1}`;
        const entries = logs[key];

        if (!entries || entries.length === 0) {
          return null;
        }

        const initial = entries[0].l;
        const current = entries[entries.length - 1].l;
        const max = Math.max(...entries.map((entry) => entry.l));
        const variation = current - initial;

        return (
          <Paper key={key} variant="outlined">
            <Typography variant="subtitle1">{exercise[0]}</Typography>
            <Typography variant="caption" color="text.secondary">
              {plan.n} · {entries.length} registro{entries.length > 1 ? "s" : ""}
            </Typography>

            <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Inicial</Typography>
                <Typography variant="subtitle2">{initial}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Atual</Typography>
                <Typography variant="subtitle2">{current}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Máxima</Typography>
                <Typography variant="subtitle2">{max}</Typography>
              </Box>
            </Stack>

            <Typography variant="body2">
              Variação: <span>{variation > 0 ? "+" : ""}{variation} kg</span>
            </Typography>
          </Paper>
        );
      })
    );

    return (
      <Stack spacing={2}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Evolução
          </Typography>
          <Typography variant="h5">Progresso</Typography>
        </Box>

        {cards.length > 0 ? (
          <Stack spacing={1.5}>{cards}</Stack>
        ) : (
          <Paper variant="outlined">
            <Typography variant="body2" color="text.secondary">
              Nenhum registro ainda. Abra a aba Treino, escolha um exercício e salve a carga e as repetições.
            </Typography>
          </Paper>
        )}
      </Stack>
    );
  };

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <AppBar position="sticky" color="primary" elevation={1}>
        <Toolbar sx={{ justifyContent: "flex-start" }}>
          <Typography variant="h6">Meu treino</Typography>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ pb: 10 }}>
        <Box sx={{ maxWidth: 560, mx: "auto", px: 2, pt: 2 }}>
          {tab === 0 ? renderTreino() : tab === 1 ? renderCiclo() : renderProgresso()}
        </Box>
      </Box>

      <Box
        component="nav"
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          backgroundColor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Tabs value={tab} onChange={(_, nextTab) => setTab(nextTab)} variant="fullWidth">
          <Tab label="Treino" />
          <Tab label="Ciclo" />
          <Tab label="Progresso" />
        </Tabs>
      </Box>
    </ThemeProvider>
  );
}
