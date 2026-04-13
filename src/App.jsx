import { useState, useEffect, useCallback } from "react";

const WEEKDAY_BUDGET = 1500;
const WEEKEND_BUDGET = 15000;
const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const QUICK_AMOUNTS = [100, 300, 500, 1000, 1500, 2000, 3000, 5000];
const CATEGORIES = [
  { id: "food", label: "食費", icon: "🍙" },
  { id: "drink", label: "飲料", icon: "☕" },
  { id: "transport", label: "交通", icon: "🚃" },
  { id: "shopping", label: "買物", icon: "🛒" },
  { id: "entertainment", label: "娯楽", icon: "🎮" },
  { id: "other", label: "他", icon: "📦" },
];

function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isWeekend(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.getDay() === 0 || d.getDay() === 6;
}

function getStorageKey(weekMonday) {
  return `budget-week:${formatDate(weekMonday)}`;
}

export default function BudgetTracker() {
  const [today] = useState(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const [expenses, setExpenses] = useState({});
  const [inputAmount, setInputAmount] = useState("");
  const [inputCategory, setInputCategory] = useState("food");
  const [inputMemo, setInputMemo] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("main");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const currentWeek = (() => {
    const ref = new Date(today);
    ref.setDate(ref.getDate() + weekOffset * 7);
    return getWeekRange(ref);
  })();

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeek.monday);
    d.setDate(d.getDate() + i);
    return formatDate(d);
  });

  const loadWeek = useCallback(async () => {
    const key = getStorageKey(currentWeek.monday);
    try {
      const value = localStorage.getItem(key);
      if (value) {
        setExpenses(JSON.parse(value));
      } else {
        setExpenses({});
      }
    } catch {
      setExpenses({});
    }
    setLoading(false);
  }, [currentWeek.monday.getTime()]);

  useEffect(() => {
    setLoading(true);
    loadWeek();
  }, [loadWeek]);

  const saveExpenses = async (newExpenses) => {
    const key = getStorageKey(currentWeek.monday);
    try {
      localStorage.setItem(key, JSON.stringify(newExpenses));
    } catch (e) {
      console.error("Save failed:", e);
    }
  };

  const addExpense = async () => {
    const amount = parseInt(inputAmount);
    if (!amount || amount <= 0) return;

    const entry = {
      id: Date.now().toString(),
      amount,
      category: inputCategory,
      memo: inputMemo,
      time: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
    };

    const dayExpenses = expenses[selectedDate] || [];
    const newExpenses = { ...expenses, [selectedDate]: [...dayExpenses, entry] };
    setExpenses(newExpenses);
    await saveExpenses(newExpenses);
    setInputAmount("");
    setInputMemo("");
  };

  const removeExpense = async (dateStr, expenseId) => {
    const dayExpenses = (expenses[dateStr] || []).filter((e) => e.id !== expenseId);
    const newExpenses = { ...expenses };
    if (dayExpenses.length === 0) {
      delete newExpenses[dateStr];
    } else {
      newExpenses[dateStr] = dayExpenses;
    }
    setExpenses(newExpenses);
    await saveExpenses(newExpenses);
    setDeleteTarget(null);
  };

  const getDayTotal = (dateStr) => {
    return (expenses[dateStr] || []).reduce((sum, e) => sum + e.amount, 0);
  };

  const getWeekendTotal = () => {
    const sat = weekDates[5];
    const sun = weekDates[6];
    return getDayTotal(sat) + getDayTotal(sun);
  };

  const getRemaining = (dateStr) => {
    if (isWeekend(dateStr)) {
      return WEEKEND_BUDGET - getWeekendTotal();
    }
    return WEEKDAY_BUDGET - getDayTotal(dateStr);
  };

  const getWeekTotal = () => {
    return weekDates.reduce((sum, d) => sum + getDayTotal(d), 0);
  };

  const getWeekBudget = () => {
    return WEEKDAY_BUDGET * 5 + WEEKEND_BUDGET;
  };

  const todayStr = formatDate(today);
  const isCurrentWeek = weekOffset === 0;
  const selectedIsWeekend = isWeekend(selectedDate);
  const remaining = getRemaining(selectedDate);
  const spent = selectedIsWeekend ? getWeekendTotal() : getDayTotal(selectedDate);
  const budget = selectedIsWeekend ? WEEKEND_BUDGET : WEEKDAY_BUDGET;
  const ratio = Math.min(spent / budget, 1);

  const getRemainingColor = (val, max) => {
    const r = val / max;
    if (r > 0.5) return "#2d8a6e";
    if (r > 0.2) return "#c78c20";
    return "#c44040";
  };

  if (loading) {
    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f7f5f0", fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif"
      }}>
        <p style={{ color: "#999", fontSize: 14 }}>読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f7f5f0",
      fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
      color: "#2a2a2a",
      maxWidth: 480,
      margin: "0 auto",
      paddingBottom: 32,
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)",
        color: "#f0ece4",
        padding: "20px 20px 16px",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: 1 }}>
            おこづかい帳
          </h1>
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            週予算 ¥{getWeekBudget().toLocaleString()}
          </div>
        </div>

        {/* Week nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button onClick={() => setWeekOffset(weekOffset - 1)} style={navBtnStyle}>‹</button>
          <span style={{ fontSize: 13, opacity: 0.8 }}>
            {new Date(weekDates[0]).getMonth() + 1}/{new Date(weekDates[0]).getDate()}
            {" 〜 "}
            {new Date(weekDates[6]).getMonth() + 1}/{new Date(weekDates[6]).getDate()}
          </span>
          <button onClick={() => setWeekOffset(weekOffset + 1)} style={navBtnStyle}>›</button>
        </div>

        {/* Day pills */}
        <div style={{ display: "flex", gap: 4 }}>
          {weekDates.map((dateStr, i) => {
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;
            const daySpent = getDayTotal(dateStr);
            const isWe = i >= 5;
            return (
              <button
                key={dateStr}
                onClick={() => { setSelectedDate(dateStr); setView("main"); }}
                style={{
                  flex: 1,
                  padding: "6px 0 4px",
                  border: "none",
                  borderRadius: 8,
                  background: isSelected ? "#f0ece4" : "rgba(255,255,255,0.08)",
                  color: isSelected ? "#2a2a2a" : isWe ? "#e8b87a" : "#ccc",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  position: "relative",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>
                  {DAY_LABELS[(i + 1) % 7]}
                </div>
                <div style={{ fontSize: 13, fontWeight: isSelected ? 700 : 400 }}>
                  {new Date(dateStr + "T00:00:00").getDate()}
                </div>
                {daySpent > 0 && (
                  <div style={{
                    width: 4, height: 4, borderRadius: "50%",
                    background: isSelected ? "#2d8a6e" : "#e8b87a",
                    margin: "3px auto 0",
                  }} />
                )}
                {isToday && (
                  <div style={{
                    position: "absolute", top: 2, right: 2,
                    width: 5, height: 5, borderRadius: "50%",
                    background: "#e86a5a",
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Budget Summary Card */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "#999" }}>
              {selectedIsWeekend ? "週末予算（土日合計）" : `${new Date(selectedDate + "T00:00:00").getMonth() + 1}/${new Date(selectedDate + "T00:00:00").getDate()}（${DAY_LABELS[new Date(selectedDate + "T00:00:00").getDay()]}）の予算`}
            </span>
            <span style={{ fontSize: 12, color: "#999" }}>
              ¥{budget.toLocaleString()}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{
            height: 8, borderRadius: 4,
            background: "#eee",
            marginBottom: 12,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              borderRadius: 4,
              width: `${ratio * 100}%`,
              background: ratio > 0.8 ? "#c44040" : ratio > 0.5 ? "#c78c20" : "#2d8a6e",
              transition: "width 0.3s, background 0.3s",
            }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>のこり</div>
              <div style={{
                fontSize: 32, fontWeight: 700,
                color: getRemainingColor(remaining, budget),
                lineHeight: 1,
                fontFeatureSettings: "'tnum'",
              }}>
                ¥{remaining.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>使った</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#555", fontFeatureSettings: "'tnum'" }}>
                ¥{spent.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          {/* Quick amounts */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => setInputAmount(String(amt))}
                style={{
                  padding: "6px 10px",
                  border: inputAmount === String(amt) ? "2px solid #2d8a6e" : "1px solid #ddd",
                  borderRadius: 20,
                  background: inputAmount === String(amt) ? "#e8f5f0" : "#fafafa",
                  color: inputAmount === String(amt) ? "#2d8a6e" : "#555",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                ¥{amt.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Amount input */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <span style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                color: "#999", fontSize: 16, fontWeight: 600,
              }}>¥</span>
              <input
                type="number"
                inputMode="numeric"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                placeholder="金額"
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 28px",
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  fontSize: 18,
                  fontWeight: 600,
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#fafafa",
                  fontFeatureSettings: "'tnum'",
                }}
              />
            </div>
          </div>

          {/* Category */}
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setInputCategory(cat.id)}
                style={{
                  flex: 1,
                  padding: "6px 2px",
                  border: inputCategory === cat.id ? "2px solid #2d8a6e" : "1px solid #eee",
                  borderRadius: 10,
                  background: inputCategory === cat.id ? "#e8f5f0" : "#fafafa",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 16 }}>{cat.icon}</div>
                <div style={{ fontSize: 9, color: inputCategory === cat.id ? "#2d8a6e" : "#999", marginTop: 1 }}>
                  {cat.label}
                </div>
              </button>
            ))}
          </div>

          {/* Memo + Submit */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={inputMemo}
              onChange={(e) => setInputMemo(e.target.value)}
              placeholder="メモ（任意）"
              style={{
                flex: 1,
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: 10,
                fontSize: 14,
                outline: "none",
                background: "#fafafa",
              }}
            />
            <button
              onClick={addExpense}
              disabled={!inputAmount || parseInt(inputAmount) <= 0}
              style={{
                padding: "10px 20px",
                border: "none",
                borderRadius: 10,
                background: inputAmount && parseInt(inputAmount) > 0 ? "#2a2a2a" : "#ccc",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: inputAmount && parseInt(inputAmount) > 0 ? "pointer" : "default",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              記録
            </button>
          </div>
        </div>
      </div>

      {/* Today's expenses list */}
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 13, color: "#999", fontWeight: 500 }}>
            {selectedIsWeekend ? "週末の記録" : "この日の記録"}
          </h3>
        </div>

        {(() => {
          const datesToShow = selectedIsWeekend ? [weekDates[5], weekDates[6]] : [selectedDate];
          const allEntries = datesToShow.flatMap((d) =>
            (expenses[d] || []).map((e) => ({ ...e, dateStr: d }))
          );

          if (allEntries.length === 0) {
            return (
              <div style={{
                background: "#fff",
                borderRadius: 16,
                padding: "24px 16px",
                textAlign: "center",
                color: "#bbb",
                fontSize: 13,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}>
                まだ記録がありません
              </div>
            );
          }

          return (
            <div style={{
              background: "#fff",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}>
              {allEntries.map((entry, idx) => {
                const cat = CATEGORIES.find((c) => c.id === entry.category) || CATEGORIES[5];
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 16px",
                      borderBottom: idx < allEntries.length - 1 ? "1px solid #f0f0f0" : "none",
                      gap: 12,
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: "#f7f5f0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, flexShrink: 0,
                    }}>
                      {cat.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {entry.memo || cat.label}
                      </div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>
                        {selectedIsWeekend && (
                          <span>{new Date(entry.dateStr + "T00:00:00").getDate()}日 </span>
                        )}
                        {entry.time}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 15, fontWeight: 600, color: "#2a2a2a",
                      fontFeatureSettings: "'tnum'", flexShrink: 0,
                    }}>
                      -¥{entry.amount.toLocaleString()}
                    </div>
                    {deleteTarget === entry.id ? (
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={() => removeExpense(entry.dateStr, entry.id)}
                          style={{
                            padding: "4px 10px", border: "none", borderRadius: 6,
                            background: "#c44040", color: "#fff", fontSize: 11,
                            fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          削除
                        </button>
                        <button
                          onClick={() => setDeleteTarget(null)}
                          style={{
                            padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6,
                            background: "#fff", color: "#999", fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteTarget(entry.id)}
                        style={{
                          padding: "4px 8px", border: "none", borderRadius: 6,
                          background: "transparent", color: "#ccc", fontSize: 16,
                          cursor: "pointer", flexShrink: 0,
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Week summary */}
      <div style={{ padding: "16px 16px 0" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#999", fontWeight: 500 }}>
          今週のまとめ
        </h3>
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "#999" }}>週の合計</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFeatureSettings: "'tnum'" }}>
                ¥{getWeekTotal().toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#999" }}>週ののこり</div>
              <div style={{
                fontSize: 20, fontWeight: 700,
                color: getRemainingColor(getWeekBudget() - getWeekTotal(), getWeekBudget()),
                fontFeatureSettings: "'tnum'",
              }}>
                ¥{(getWeekBudget() - getWeekTotal()).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Mini bar chart */}
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 48 }}>
            {weekDates.map((dateStr, i) => {
              const dayTotal = getDayTotal(dateStr);
              const dayBudget = i >= 5 ? WEEKEND_BUDGET / 2 : WEEKDAY_BUDGET;
              const barRatio = dayBudget > 0 ? Math.min(dayTotal / dayBudget, 1.5) : 0;
              const over = dayTotal > dayBudget;
              return (
                <div key={dateStr} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{
                    height: Math.max(barRatio * 32, dayTotal > 0 ? 4 : 0),
                    borderRadius: 3,
                    background: over ? "#c44040" : dateStr === selectedDate ? "#2d8a6e" : "#d5d0c6",
                    transition: "all 0.3s",
                    marginBottom: 4,
                  }} />
                  <div style={{ fontSize: 9, color: dateStr === todayStr ? "#2a2a2a" : "#bbb", fontWeight: dateStr === todayStr ? 700 : 400 }}>
                    {DAY_LABELS[(i + 1) % 7]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "20px 16px 0",
        textAlign: "center",
        fontSize: 10,
        color: "#ccc",
      }}>
        平日 ¥1,500 / 土日 ¥15,000
      </div>
    </div>
  );
}

const navBtnStyle = {
  width: 32, height: 32,
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 8,
  background: "transparent",
  color: "#f0ece4",
  fontSize: 18,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
