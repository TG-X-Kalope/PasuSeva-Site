/*! CustomDatePicker (vanilla JS) - single file - no deps */
(function () {
    class CustomDatePicker {
        /**
         * @param {HTMLInputElement|string} inputOrSelector - input element or selector
         * @param {Object} opts
         * @param {number} [opts.startYear=1990]
         * @param {'day'|'month'|'year'} [opts.defaultView='day']
         * @param {(date: Date|null)=>void} [opts.onChange]
         * @param {(date: Date)=>string} [opts.format] - formats value written to input
         */
        constructor(inputOrSelector, opts = {}) {
            this.input =
                typeof inputOrSelector === "string"
                    ? document.querySelector(inputOrSelector)
                    : inputOrSelector;

            if (!this.input) {
                console.warn("CustomDatePicker: input not found");
                return;
            }

            // Options
            this.opts = Object.assign(
                {
                    startYear: 1990,
                    defaultView: "day",
                    onChange: null,
                    format: (d) => d.toLocaleDateString(), // default: locale string
                },
                opts
            );

            // State
            const initial = this.input.value ? new Date(this.input.value) : new Date();
            this.displayDate = isNaN(initial.getTime()) ? new Date() : initial;
            this.currentView = this.opts.defaultView;
            this.yearRangeStart = this.opts.startYear;
            this.isOpen = false;

            // Build UI
            this._build();
            this._bind();
        }

        /** Build dropdown DOM once */
        _build() {
            // Wrapper (positioning)
            this.wrapper = document.createElement("div");
            this.wrapper.style.position = "relative";
            this.input.parentNode.insertBefore(this.wrapper, this.input);
            this.wrapper.appendChild(this.input);

            // Panel
            this.panel = document.createElement("div");
            this.panel.className = "cdp-panel";
            this.panel.setAttribute("role", "dialog");
            this.panel.style.position = "absolute";
            this.panel.style.minWidth = "270px";
            this.panel.style.zIndex = "9999";
            this.panel.style.background = "#fff";
            this.panel.style.border = "1px solid #FDDC1B"; // gray-300
            this.panel.style.borderRadius = "0.375rem"; // rounded-md
            this.panel.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)";
            this.panel.style.marginTop = "4px";
            this.panel.style.display = "none";

            // Header (year & month buttons)
            this.header = document.createElement("div");
            this.header.style.display = "flex";
            this.header.style.justifyContent = "space-between";
            this.header.style.alignItems = "center";
            this.header.style.padding = "8px";
            this.header.style.borderBottom = "1px solid #E5E7EB";

            this.btnYear = this._button(this.displayDate.getFullYear());
            this.btnMonth = this._button(
                this.displayDate.toLocaleString("default", { month: "long" })
            );
            this.header.appendChild(this.btnYear);
            this.header.appendChild(this.btnMonth);

            // Content
            this.content = document.createElement("div");

            this.panel.appendChild(this.header);
            this.panel.appendChild(this.content);
            this.wrapper.appendChild(this.panel);

            // Minimal styles for grid text (week header)
            this._injectBaseStyles();
        }

        /** Basic button helper */
        _button(text, title) {
            const b = document.createElement("button");
            b.type = "button";
            b.textContent = text;
            b.title = title || "";
            b.style.padding = "4px 8px";
            b.style.borderRadius = "6px";
            b.style.border = "none";
            b.style.background = "transparent";
            b.style.cursor = "pointer";
            b.addEventListener("mouseenter", () => (b.style.background = "#F3F4F6"));
            b.addEventListener("mouseleave", () => (b.style.background = "transparent"));
            return b;
        }

        /** Icon button (chevrons) */
        _icon(direction) {
            const btn = this._button("");
            btn.innerHTML =
                direction === "left"
                    ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>`
                    : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`;
            btn.style.padding = "2px";
            return btn;
        }

        /** Attach events */
        _bind() {
            // Open/close
            this.input.addEventListener("click", () => {
                this.isOpen ? this.close() : this.open();
            });

            // Outside click
            this._outsideHandler = (e) => {
                if (!this.wrapper.contains(e.target)) this.close();
            };
            document.addEventListener("mousedown", this._outsideHandler);

            // Switch view via header
            this.btnYear.addEventListener("click", () => this._switchView("year"));
            this.btnMonth.addEventListener("click", () => this._switchView("month"));
        }

        /** Render according to currentView */
        _render() {
            // Update header labels
            this.btnYear.textContent = this.displayDate.getFullYear();
            this.btnMonth.textContent = this.displayDate.toLocaleString("default", {
                month: "long",
            });

            // Clear content
            this.content.innerHTML = "";

            if (this.currentView === "year") this._renderYearView();
            else if (this.currentView === "month") this._renderMonthView();
            else this._renderDayView();
        }

        _renderYearView() {
            const host = document.createElement("div");
            host.style.padding = "8px";

            const top = document.createElement("div");
            top.style.display = "flex";
            top.style.justifyContent = "space-between";
            top.style.alignItems = "center";
            top.style.marginBottom = "8px";

            const left = this._icon("left");
            const right = this._icon("right");
            left.addEventListener("click", () => {
                this.yearRangeStart -= 12;
                this._render();
            });
            right.addEventListener("click", () => {
                this.yearRangeStart += 12;
                this._render();
            });

            const range = document.createElement("span");
            range.style.fontWeight = "600";
            range.textContent = `${this.yearRangeStart} - ${this.yearRangeStart + 11}`;

            top.appendChild(left);
            top.appendChild(range);
            top.appendChild(right);
            host.appendChild(top);

            const grid = document.createElement("div");
            grid.style.display = "grid";
            grid.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
            grid.style.gap = "8px";

            const years = Array.from({ length: 12 }, (_, i) => this.yearRangeStart + i);
            years.forEach((year) => {
                const b = this._button(year.toString());
                if (this.displayDate.getFullYear() === year) {
                    b.style.background = "#3B82F6";
                    b.style.color = "#fff";
                } else {
                    b.addEventListener("mouseenter", () => (b.style.background = "#E5E7EB"));
                    b.addEventListener("mouseleave", () => (b.style.background = "transparent"));
                }
                b.addEventListener("click", () => {
                    const d = new Date(this.displayDate);
                    d.setFullYear(year);
                    this.displayDate = d;
                    this._switchView("month");
                });
                grid.appendChild(b);
            });

            host.appendChild(grid);
            this.content.appendChild(host);
        }

        _renderMonthView() {
            const host = document.createElement("div");
            host.style.padding = "8px";

            const top = document.createElement("div");
            top.style.display = "flex";
            top.style.justifyContent = "space-between";
            top.style.alignItems = "center";
            top.style.marginBottom = "8px";

            const backToYear = this._icon("left");
            backToYear.title = "Back to years";
            backToYear.addEventListener("click", () => this._switchView("year"));

            const title = document.createElement("span");
            title.style.fontWeight = "600";
            title.textContent = this.displayDate.getFullYear();

            top.appendChild(backToYear);
            top.appendChild(title);
            top.appendChild(document.createElement("div"));
            host.appendChild(top);

            const grid = document.createElement("div");
            grid.style.display = "grid";
            grid.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
            grid.style.gap = "8px";

            const monthNames = Array.from({ length: 12 }, (_, i) =>
                new Date(0, i).toLocaleString("default", { month: "short" })
            );

            monthNames.forEach((name, idx) => {
                const b = this._button(name);
                if (this.displayDate.getMonth() === idx) {
                    b.style.background = "#3B82F6";
                    b.style.color = "#fff";
                } else {
                    b.addEventListener("mouseenter", () => (b.style.background = "#E5E7EB"));
                    b.addEventListener("mouseleave", () => (b.style.background = "transparent"));
                }
                b.addEventListener("click", () => {
                    const d = new Date(this.displayDate);
                    d.setMonth(idx);
                    this.displayDate = d;
                    this._switchView("day");
                });
                grid.appendChild(b);
            });

            host.appendChild(grid);
            this.content.appendChild(host);
        }

        _renderDayView() {
            const host = document.createElement("div");
            host.style.padding = "8px";

            const y = this.displayDate.getFullYear();
            const m = this.displayDate.getMonth();
            const firstDay = new Date(y, m, 1);
            const daysInMonth = new Date(y, m + 1, 0).getDate();
            const startingDay = firstDay.getDay();

            const top = document.createElement("div");
            top.style.display = "flex";
            top.style.justifyContent = "space-between";
            top.style.alignItems = "center";
            top.style.marginBottom = "8px";

            const prev = this._icon("left");
            const next = this._icon("right");
            prev.addEventListener("click", () => {
                this.displayDate = new Date(y, m - 1, 1);
                this._render();
            });
            next.addEventListener("click", () => {
                this.displayDate = new Date(y, m + 1, 1);
                this._render();
            });

            const title = document.createElement("span");
            title.style.fontWeight = "600";
            title.textContent = this.displayDate.toLocaleString("default", {
                month: "long",
                year: "numeric",
            });

            top.appendChild(prev);
            top.appendChild(title);
            top.appendChild(next);
            host.appendChild(top);

            // Week header
            const week = document.createElement("div");
            week.className = "cdp-week";
            ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((d) => {
                const div = document.createElement("div");
                div.textContent = d;
                week.appendChild(div);
            });
            host.appendChild(week);

            // Day grid
            const grid = document.createElement("div");
            grid.style.display = "grid";
            grid.style.gridTemplateColumns = "repeat(7, minmax(0, 1fr))";
            grid.style.gap = "4px";
            grid.style.textAlign = "center";

            for (let i = 0; i < startingDay; i++) {
                const empty = document.createElement("div");
                empty.style.padding = "8px";
                grid.appendChild(empty);
            }

            const today = new Date();
            for (let d = 1; d <= daysInMonth; d++) {
                const btn = this._button(String(d));
                btn.style.padding = "8px";
                btn.addEventListener("mouseenter", () => (btn.style.background = "#E5E7EB"));
                btn.addEventListener("mouseleave", () => {
                    if (!btn.dataset.selected) btn.style.background = "transparent";
                });

                const candidate = new Date(y, m, d);
                const isToday = today.toDateString() === candidate.toDateString();
                const inputDate = this.input.value ? new Date(this.input.value) : null;
                const isSelected =
                    inputDate &&
                    !isNaN(inputDate) &&
                    inputDate.getFullYear() === y &&
                    inputDate.getMonth() === m &&
                    inputDate.getDate() === d;

                if (isToday && !isSelected) {
                    btn.style.border = "1px solid #3B82F6";
                }
                if (isSelected) {
                    btn.style.background = "#3B82F6";
                    btn.style.color = "#fff";
                    btn.dataset.selected = "1";
                }

                btn.addEventListener("click", () => {
                    // set time to noon to avoid TZ issues
                    const localSafe = new Date(y, m, d, 12, 0, 0);
                    this._setValue(localSafe);
                    this.close();
                });

                grid.appendChild(btn);
            }

            host.appendChild(grid);
            this.content.appendChild(host);
        }

        _switchView(view) {
            this.currentView = view;
            this._render();
        }

        _setValue(date) {
            this.input.value = this.opts.format(date);
            // fire native change event
            const evt = new Event("change", { bubbles: true });
            this.input.dispatchEvent(evt);
            if (typeof this.opts.onChange === "function") this.opts.onChange(date);
        }

        open() {
            if (this.isOpen) return;
            this.isOpen = true;
            this.panel.style.display = "block";
            this._render();
        }

        close() {
            this.isOpen = false;
            this.panel.style.display = "none";
        }

        destroy() {
            document.removeEventListener("mousedown", this._outsideHandler);
            this.panel.remove();
            // unwrap input
            this.wrapper.parentNode.insertBefore(this.input, this.wrapper);
            this.wrapper.remove();
        }

        /** Inject tiny CSS for week header */
        _injectBaseStyles() {
            if (document.getElementById("cdp-base-styles")) return;
            const style = document.createElement("style");
            style.id = "cdp-base-styles";
            style.textContent = `
        .cdp-panel .cdp-week {
          display:grid;
          grid-template-columns: repeat(7, minmax(0,1fr));
          gap: 4px;
          margin-bottom: 4px;
          font-size: 12px;
          color: #6B7280; /* gray-500 */
          text-align:center;
          font-weight: 600;
        }
      `;
            document.head.appendChild(style);
        }
    }

    // Auto-init: any input with data-datepicker
    function autoInit() {
        document.querySelectorAll('input[data-datepicker]').forEach((el) => {
            if (!el._cdpInstance) {
                el._cdpInstance = new CustomDatePicker(el);
            }
        });
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", autoInit);
    } else {
        autoInit();
    }

    // expose globally
    window.CustomDatePicker = CustomDatePicker;
})();
