/** @odoo-module **/

import { describe, expect, test } from "@odoo/hoot";
import { animationFrame } from "@odoo/hoot-dom";
import { assets } from "@web/core/assets";
import { contains, defineModels, fields, models, mountView, onRpc, patchWithCleanup } from "@web/../tests/web_test_helpers";

describe.current.tags("desktop");

// La bibliothèque Plotly réelle (4,8 Mo) n'est pas nécessaire pour tester l'injection du HTML et
// l'exécution du script : ce widget ne fait que ça, le rendu du graphe lui-même appartient à Plotly.
const FAKE_HTML = '<div class="plotly-graph-div">contenu du graphe</div><script>window.__fmpPlotlyRan = (window.__fmpPlotlyRan || 0) + 1;</script>';

const FAKE_HTML_2 = '<div class="plotly-graph-div">autre graphe</div><script>window.__fmpPlotlyRan2 = (window.__fmpPlotlyRan2 || 0) + 1;</script>';

class PlotlyTestModel extends models.Model {
    _name = "plotly.widget.test";

    value = fields.Char();

    _records = [
        { id: 1, value: FAKE_HTML },
        { id: 2, value: false },
        { id: 3, value: FAKE_HTML_2 },
    ];
}

defineModels([PlotlyTestModel]);

describe("web_widget_plotly_chart", () => {
    test("injecte le <div> du graphe et exécute le script inline", async () => {
        onRpc("has_group", () => true);
        patchWithCleanup(assets, { loadJS: () => Promise.resolve() });
        delete window.__fmpPlotlyRan;

        await mountView({
            type: "form",
            resModel: "plotly.widget.test",
            resId: 1,
            arch: `<form><field name="value" widget="plotly_chart"/></form>`,
        });
        await animationFrame();

        expect(".plotly-graph-div").toHaveCount(1);
        expect(".plotly-graph-div").toHaveText("contenu du graphe");
        expect(window.__fmpPlotlyRan).toBe(1);
    });

    test("valeur absente : pas d'erreur, rien d'injecté", async () => {
        onRpc("has_group", () => true);
        patchWithCleanup(assets, { loadJS: () => Promise.resolve() });

        await mountView({
            type: "form",
            resModel: "plotly.widget.test",
            resId: 2,
            arch: `<form><field name="value" widget="plotly_chart"/></form>`,
        });
        await animationFrame();

        expect(".plotly-graph-div").toHaveCount(0);
    });

    test("changer de fiche ne rejoue le script qu'une seule fois (pas de double rendu)", async () => {
        // Régression : useEffect() (effet réactif, se relance quand la valeur change) ET
        // onPatched() (se relance à chaque patch, y compris celui que ce changement de valeur
        // provoque) appelaient tous deux updatePlotly() - le script s'exécutait deux fois par
        // changement de valeur, recréant deux fois le <div> du graphe.
        onRpc("has_group", () => true);
        patchWithCleanup(assets, { loadJS: () => Promise.resolve() });
        delete window.__fmpPlotlyRan;
        delete window.__fmpPlotlyRan2;

        await mountView({
            type: "form",
            resModel: "plotly.widget.test",
            resIds: [1, 3],
            resId: 1,
            arch: `<form><field name="value" widget="plotly_chart"/></form>`,
        });
        await animationFrame();
        expect(window.__fmpPlotlyRan).toBe(1);

        await contains(".o_pager_next").click();
        await animationFrame();

        expect(window.__fmpPlotlyRan2).toBe(1, {
            message: "le script de la nouvelle fiche doit s'exécuter une seule fois",
        });
    });
});
