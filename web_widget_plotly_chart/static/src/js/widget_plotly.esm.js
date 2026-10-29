/** @odoo-module **/

import {CharField, charField} from "@web/views/fields/char/char_field";
import {loadJS} from "@web/core/assets";
import {registry} from "@web/core/registry";

import {onPatched, onWillStart, signal, useEffect} from "@odoo/owl";

export class PlotlyChartWidget extends CharField {
    static template = "web_widget_plotly_chart.PlotlyChartWidgetField";

    widget = signal.ref();

    setup() {
        super.setup();

        onPatched(() => {
            this.updatePlotly(this.props.record.data[this.props.name]);
        });

        useEffect(() => {
            this.updatePlotly(this.props.record.data[this.props.name]);
        });

        onWillStart(() => loadJS("/web_widget_plotly_chart/static/src/lib/plotly/plotly-4.1.1.min.js"));
    }
    updatePlotly(value) {
        const value_html = new DOMParser().parseFromString(value, "text/html");
        const div = value_html.querySelector(".plotly-graph-div")?.outerHTML || "";
        // Plus d'un <script> possible dans la valeur : plotly.offline.plot() en genere deja un
        // (son propre Plotly.newPlot(...)), et un consommateur de ce widget peut en concatener un
        // second a la suite (ex. goodstock_graph_history_for_product.py:_get_y_axis_autoresize_script,
        // qui recalibre l'axe Y sur la fenetre visible). querySelector("script") (singulier)
        // ne recuperait que le PREMIER des deux et executait silencieusement le second nulle part -
        // regression relevee par Thomas le 29/10/2026 : le recalibrage au chargement/pan ("remonter
        // le plus haut possible les dents de scie") ne se declenchait plus du tout.
        const scripts = [...value_html.querySelectorAll("script")].map((scriptEl) => scriptEl.textContent).join("\n");

        const el = this.widget();
        if (el) {
            el.innerHTML = div;
            new Function(scripts)();
        }
    }
}

export const plotlyChartWidget = {
    ...charField,
    component: PlotlyChartWidget,
    supportedTypes: ["char", "text"],
};

registry.category("fields").add("plotly_chart", plotlyChartWidget);
