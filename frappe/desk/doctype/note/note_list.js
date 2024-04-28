frappe.listview_settings["Note"] = {
	hide_name_column: true,
	// add_fields: ["public"],
	get_indicator: function (doc) {
		if (doc.public) {
			return [__("Public"), "green", "public,=,Yes"];
		} else {
			return [__("Private"), "blue", "public,=,No"];
		}
	},
    button: {
        show(doc) {
            return doc.reference_name;
        },
        get_label() {
            return 'View';
        },
        get_description(doc) {
            return __('View {0}', [`${doc.reference_type} ${doc.reference_name}`])
        },
        action(doc) {
            frappe.set_route('Form', doc.reference_type, doc.reference_name);
        }
    },
    formatters: {
        title(val) {
            return val.bold();
        },
        public(val) {
            return val ? 'Yes' : 'No';
        }
    }
};
