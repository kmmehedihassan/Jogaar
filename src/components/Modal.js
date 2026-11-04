import React, { useEffect, useRef } from "react";
import { HiX } from "react-icons/hi";
import { useUi } from "../context/UiContext";

/** Accessible dialog: closes on Escape or backdrop click, returns focus on close. */
export default function Modal({ title, onClose, children }) {
  const { t } = useUi();
  const boxRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const box = boxRef.current;
    const first = box && box.querySelector("input, select, textarea, button:not(.modal__close)");
    if (first) first.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && box) {
        const focusable = box.querySelectorAll("button, input, select, textarea, a[href]");
        const list = Array.from(focusable).filter((el) => !el.disabled);
        if (!list.length) return;
        const firstEl = list[0];
        const lastEl = list[list.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
      if (previous && previous.focus) previous.focus();
    };
  }, [onClose]);

  return (
    <div className="modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__box" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={boxRef}>
        <div className="modal__head">
          <h2 id="modal-title">{title}</h2>
          <button className="modal__close" onClick={onClose} aria-label={t("common.close")}>
            <HiX size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
