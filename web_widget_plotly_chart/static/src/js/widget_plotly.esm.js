/** @odoo-module **/

import {CharField, charField} from "@web/views/fields/char/char_field";
import {loadJS} from "@web/core/assets";
import {registry} from "@web/core/registry";

import {onWillStart, signal, useEffect} from "@odoo/owl";

export class PlotlyChartWidget extends CharField {
    static template = "web_widget_plotly_chart.PlotlyChartWidgetField";

    widget = signal.ref();

    setup() {
        super.setup();

        // useEffect() ici est un effet réactif (suit les lectures faites dans son corps, pas un
        // hook "à chaque rendu" façon React) : il se relance tout seul quand la valeur du champ
        // change, sans avoir besoin d'un onPatched() en plus - qui, lui, se relance à CHAQUE patch,
        // y compris ceux déclenchés par ce même changement de valeur. Les deux combinés rejouaient
        // deux fois de suite l'injection du HTML à chaque changement de valeur, recréant deux fois
        // le <div> du graphe et invalidant toute référence prise entre les deux (constaté en test :
        // un graphe interrogé juste après son premier rendu pouvait déjà avoir été remplacé).
        useEffect(() => {
            this.updatePlotly(this.props.record.data[this.props.name]);
        });

        onWillStart(() =>
            loadJS("/web_widget_plotly_chart/static/src/lib/plotly/plotly-4.1.1.min.js")
        );
    }
    updatePlotly(value) {
        const value_html = new DOMParser().parseFromString(value, "text/html");
        const div = value_html.querySelector(".plotly-graph-div")?.outerHTML || "";
        const script = value_html.querySelector("script")?.textContent || "";

        const el = this.widget();
        if (el) {
            el.innerHTML = div;
            new Function(script)();
        }
    }
}

export const plotlyChartWidget = {
    ...charField,
    component: PlotlyChartWidget,
    supportedTypes: ["char", "text"],
};

registry.category("fields").add("plotly_chart", plotlyChartWidget);
