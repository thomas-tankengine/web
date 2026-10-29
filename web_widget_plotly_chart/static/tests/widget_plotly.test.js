/** @odoo-module **/

import {describe, expect, test} from "@odoo/hoot";
import {animationFrame} from "@odoo/hoot-dom";
import {assets} from "@web/core/assets";
import {defineModels, fields, models, mountView, onRpc, patchWithCleanup} from "@web/../tests/web_test_helpers";

describe.current.tags("desktop");

class PlotlyTestModel extends models.Model {
    _name = "plotly.widget.test";

    value = fields.Char();

    _records = [{id: 1}];
}

defineModels([PlotlyTestModel]);

async function mountPlotly(value) {
    onRpc("has_group", () => true);
    patchWithCleanup(assets, {loadJS: () => Promise.resolve()});
    PlotlyTestModel._records[0].value = value;
    await mountView({
        type: "form",
        resModel: "plotly.widget.test",
        resId: 1,
        arch: `<form><field name="value" widget="plotly_chart"/></form>`,
    });
    await animationFrame();
}

describe("web_widget_plotly_chart", () => {
    test("un seul <script> dans la valeur : exécuté normalement", async () => {
        window.goodstockPlotlyTestMarkerA = false;
        await mountPlotly(
            '<div class="plotly-graph-div"></div>' + "<script>window.goodstockPlotlyTestMarkerA = true;</script>"
        );

        expect(window.goodstockPlotlyTestMarkerA).toBe(true);
        delete window.goodstockPlotlyTestMarkerA;
    });

    // Régression du 29/10/2026 : updatePlotly() ne récupérait que le PREMIER <script> de la valeur
    // (querySelector, singulier) et exécutait silencieusement celui-là seul. Une valeur avec deux
    // <script> - le propre Plotly.newPlot(...) de plotly.offline.plot(), suivi d'un second script
    // concaténé par un consommateur du widget (ex. goodstock_graph_history_for_product.py -
    // _get_y_axis_autoresize_script, qui recalibre l'axe Y sur la fenêtre visible au chargement et
    // au pan) - perdait donc ce second script sans la moindre erreur visible. Remontée par Thomas :
    // "il manque... quand ça s'affiche la première fois... on remonte le plus haut possible les
    // dents de scie. Ça, on l'avait fait il n'y a pas si longtemps que ça."
    test("deux <script> dans la valeur : les deux sont exécutés, dans l'ordre", async () => {
        window.goodstockPlotlyTestOrder = [];
        await mountPlotly(
            '<div class="plotly-graph-div"></div>' +
                "<script>window.goodstockPlotlyTestOrder.push('first');</script>" +
                "<script>window.goodstockPlotlyTestOrder.push('second');</script>"
        );

        expect(window.goodstockPlotlyTestOrder).toEqual(["first", "second"]);
        delete window.goodstockPlotlyTestOrder;
    });
});
