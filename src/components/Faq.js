import React, { useState } from "react";
import { HiPlus, HiMinus } from "react-icons/hi";
import { FAQS } from "../data/seed";

export default function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="faq">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className={`faq__item ${isOpen ? "is-open" : ""}`}>
            <button
              className="faq__q"
              aria-expanded={isOpen}
              aria-controls={`faq-${i}`}
              onClick={() => setOpen(isOpen ? -1 : i)}
            >
              {item.q}
              {isOpen ? <HiMinus /> : <HiPlus />}
            </button>
            {isOpen && (
              <p id={`faq-${i}`} className="faq__a">
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
