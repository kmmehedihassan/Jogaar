import React, { useState } from "react";
import { HiPlus, HiMinus } from "react-icons/hi";
import { useUi } from "../context/UiContext";

const ITEMS = [1, 2, 3, 4, 5];

export default function Faq() {
  const { t } = useUi();
  const [open, setOpen] = useState(1);
  return (
    <div className="faq">
      {ITEMS.map((n) => {
        const isOpen = open === n;
        return (
          <div key={n} className={`faq__item ${isOpen ? "is-open" : ""}`}>
            <button className="faq__q" aria-expanded={isOpen} aria-controls={`faq-${n}`} onClick={() => setOpen(isOpen ? 0 : n)}>
              {t(`faq.q${n}`)}
              {isOpen ? <HiMinus /> : <HiPlus />}
            </button>
            {isOpen && (
              <p id={`faq-${n}`} className="faq__a">
                {t(`faq.a${n}`)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
