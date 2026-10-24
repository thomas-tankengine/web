/* Copyright 2018 Simone Orsi - Camptocamp SA
License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html). */

import {UrlField, formUrlField, urlField} from "@web/views/fields/url/url_field";
import {
    copyClipboardURLField,
    copyClipboardFieldProps,
} from "@web/views/fields/copy_clipboard/copy_clipboard_field";
import {standardFieldProps} from "@web/views/fields/standard_field_props";
import {patch} from "@web/core/utils/patch";
import {t, useProps} from "@odoo/owl";

// En v20, `static props = {...}` (schéma partagé, patchable depuis l'extérieur) a disparu au profit
// d'un champ d'instance `props = useProps({...})` propre à chaque composant (cf. UrlField/
// CopyClipboardField dans le cœur) : il n'y a plus d'objet statique commun à patcher, d'où le
// `TypeError: Cannot convert undefined or null to object` au chargement (patch() sur `undefined`).
// Le schéma de base doit donc être dupliqué ici (pas d'alternative : useProps lit ses clés au moment
// de l'appel, pas d'un objet réutilisable) et réappliqué via un `setup()` patché, qui réaffecte
// `this.props` après l'appel du `setup()` d'origine (champ d'instance déjà posé avant `setup()`,
// `useProps` peut être rappelé sans risque, cf. `owl.js::makeProps` - lit `node.props`, pas
// `this.props`).
const AdvancedUrlFieldProps = {
    text_field: t.string().optional(),
    prefix_name: t.string().optional(),
};

patch(UrlField.prototype, {
    setup() {
        super.setup(...arguments);
        this.props = useProps({
            ...standardFieldProps,
            placeholder: t.string().optional(),
            text: t.string().optional(),
            websitePath: t.boolean().optional(),
            ...AdvancedUrlFieldProps,
        });
    },

    _get_text_field() {
        if (this.props.text_field) {
            let field_value = this.props.record.data[this.props.text_field];
            if (Array.isArray(field_value) && field_value.length === 2) {
                field_value = field_value[1];
            }
            return field_value;
        }
        return false;
    },

    get title() {
        return (
            this._get_text_field() ||
            this.props.text ||
            this.props.record.data[this.props.name] ||
            ""
        );
    },

    get formattedHrefWithPrefix() {
        let value = this.formattedHref;

        if (this.props.prefix_name) {
            value = this.props.prefix_name + ":" + value;
        }

        return value;
    },
});

patch(copyClipboardURLField.component.prototype, {
    setup() {
        super.setup(...arguments);
        this.props = useProps({
            ...copyClipboardFieldProps,
            ...AdvancedUrlFieldProps,
        });
    },
});

const patchExtractProps = () => ({
    extractProps({attrs, options}) {
        const props = super.extractProps(...arguments);
        props.text_field = attrs.text_field || options.text_field;
        props.prefix_name = attrs.prefix_name || options.prefix_name;
        return props;
    },
});

patch(urlField, patchExtractProps());
patch(formUrlField, patchExtractProps());
patch(copyClipboardURLField, patchExtractProps());
