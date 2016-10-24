// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

frappe.provide('frappe.views');

// opts:
// stats = list of fields
// doctype
// parent
// set_filter = function called on click

frappe.views.ListSidebar = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.make();
		this.get_stats();
	},
	make: function() {
		var sidebar_content = frappe.render_template("list_sidebar", {doctype: this.doclistview.doctype});

		this.sidebar = $('<div class="list-sidebar overlay-sidebar hidden-xs hidden-sm"></div>')
			.html(sidebar_content)
			.appendTo(this.page.sidebar.empty());

		this.setup_reports();
		this.setup_assigned_to_me();
		this.setup_views();

	},
	setup_views: function() {
		var show_list_link = false;

		if(frappe.views.calendar[this.doctype]) {
			this.sidebar.find(".calendar-link").removeClass("hide");
			this.sidebar.find('.list-link[data-view="Gantt"]').removeClass('hide');
			show_list_link = true;
		}

		if(frappe.treeview_settings[this.doctype]) {
			this.sidebar.find(".tree-link").removeClass("hide");
		}

		this.current_view = 'List';
		var route = frappe.get_route();
		if(route.length > 2 && (route[2]==='Gantt' || route[2]==='Image')) {
			this.current_view = route[2];
		}

		// disable link for current view
		this.sidebar.find('.list-link[data-view="'+ this.current_view +'"] a')
			.attr('disabled', 'disabled').addClass('disabled');

		// show image link if image_view
		if(this.doclistview.meta.image_field) {
			this.sidebar.find('.list-link[data-view="Image"]').removeClass('hide');
			show_list_link = true;
		}

		if(show_list_link) {
			this.sidebar.find('.list-link[data-view="List"]').removeClass('hide');
		}
	},
	setup_reports: function() {
		// add reports linked to this doctype to the dropdown
		var me = this;
		var added = [];
		var dropdown = this.page.sidebar.find('.reports-dropdown');
		var divider = false;

		var add_reports = function(reports) {
			$.each(reports, function(name, r) {
				if(!r.ref_doctype || r.ref_doctype==me.doctype && !r.disabled) {
					var report_type = r.report_type==='Report Builder'
						? 'Report/' + r.ref_doctype : 'query-report';
					var route = r.route || report_type + '/' + r.name;

					if(added.indexOf(route)===-1) {
						// don't repeat
						added.push(route);

						if(!divider) {
							$('<li role="separator" class="divider"></li>').appendTo(dropdown);
							divider = true;
						}

						$('<li><a href="#'+ route + '">'
							+ __(r.name)+'</a></li>').appendTo(dropdown);
					}
				}
			});
		}

		// from reference doctype
		if(this.doclistview.listview.settings.reports) {
			add_reports(this.doclistview.listview.settings.reports)
		}

		// from specially tagged reports
		add_reports(frappe.boot.user.all_reports || []);
	},
	setup_assigned_to_me: function() {
		var me = this;
		this.page.sidebar.find(".assigned-to-me a").on("click", function() {
			me.doclistview.assigned_to_me();
		});
	},
	get_stats: function() {
		var me = this
		return frappe.call({
			type: "GET",
			method: 'frappe.desk.reportview.get_stats',
			args: {
				stats: me.stats,
				doctype: me.doctype
			},
			callback: function(r) {
				// This gives a predictable stats order
				$.each(me.stats, function(i, v) {
					me.render_stat(v, (r.message || {})[v]);
				});

				// reload button at the end
				// if(me.stats.length) {
				// 	$('<a class="small text-muted">'+__('Refresh Stats')+'</a>')
				// 		.css({"margin-top":"15px", "display":"inline-block"})
				// 		.click(function() {
				// 			me.reload_stats();
				// 			return false;
				// 		}).appendTo($('<div class="stat-wrapper">')
				// 			.appendTo(me.sidebar));
				// }

				me.doclistview.set_sidebar_height();
			}
		});
	},
	render_stat: function(field, stat) {
		var me = this;
		var sum = 0;
		var label = frappe.meta.docfield_map[this.doctype][field] ?
			frappe.meta.docfield_map[this.doctype][field].label : field;
		var show_tags = '<a class="list-tag-preview hidden-xs" title="' + __("Show tags")
			+ '"><i class="octicon octicon-pencil"></i></a>';

		stat = (stat || []).sort(function(a, b) { return b[1] - a[1] });
		$.each(stat, function(i,v) { sum = sum + v[1]; })

		var context = {
			field: field,
			stat: stat,
			sum: sum,
			label: label==='_user_tags' ? (__("Tags") + show_tags) : __(label),
		};

		var sidebar_stat = $(frappe.render_template("list_sidebar_stat", context))
			.on("click", ".stat-link", function() {
				var fieldname = $(this).attr('data-field');
				var label = $(this).attr('data-label');
				me.set_filter(fieldname, label);
			})
			.appendTo(this.sidebar);
	},
	reload_stats: function() {
		this.sidebar.find(".sidebar-stat").remove();
		this.get_stats();
	},
});
