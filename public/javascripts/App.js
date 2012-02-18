(function() {
    var services = {
        Production: {
         root: "www.flymine.org/query", 
         token: "21k3D5x5B8pdd8T9yeY24fG8th2"
        },
        Preview: {
          root: "preview.flymine.org/preview",
          token: "T1f3e5D8H9f0w7n1U3RaraXk9J8"
        }
    };
    window.App = {
        im: new intermine.Service(services.Production),
        Mediator: _.clone(Backbone.Events),
    };

    App.Mediator.state = {};
    var SCOPE_TITLES = {
        user: "Showing only items that belong to you"
    };

    var isUserTag = function(t) {
        if (t === "im:favourite") {
            return true; // The exception
        } 
        return !(t.substring(0, 3) == "im:");
    };

    var publish = function() {
        var args = Array.prototype.slice.call(arguments);
        console.debug(arguments);
        App.Mediator.trigger.apply(App.Mediator, arguments);
    };

    var publisher = function() {
        var args = arguments;
        return function () {publish.apply(this, args)};
    };

    var Lists = Backbone.Collection.extend({
    });

    var Templates = Backbone.Collection.extend({
    });

    var label_classes = [
        "", "label-success", "label-info", "label-warning", "label-important",
        "label-other", "label-other2"
    ];
    var seen_tags = [];
    function getTagLabelClass(tag) {
        if (!_(seen_tags).include(tag)) {
            seen_tags.push(tag);
        }
        var label_idx = _(seen_tags).indexOf(tag) % label_classes.length;
        var lc = label_classes[label_idx];
        return lc;
    }

    var Tag = Backbone.View.extend({

        tagTemplate:_.template('<span class=tag-text><%= text %></span><i class="icon-tag icon-white"></i>'),

        tagName: "span",
        className: "label tag",

        events: {
            hover: "hoverHandler",
            click: "clickHandler"
        },

        hoverHandler: function() {
            if (this.collapsible) {
                this.$('.tag-text').animate({width: 'toggle'}, 100)
            }
        },
        clickHandler: function() { 
            if (this.isFilter) {
                App.Mediator.trigger("tag-selected", this.text); 
            }
            return false;
        },

        initialize: function(text, opts) {
            _.bindAll(this, "render", "clickHandler", "hoverHandler");
            opts = opts || {};
            _.defaults(opts, {collapsible: true, isFilter: true});
            this.text = text;
            this.isFilter = opts.isFilter;
            this.collapsible = opts.collapsible;
            this.$el.addClass(getTagLabelClass(text));
            this.render();
        },

        render: function() {
            this.$el.append(this.tagTemplate({text: this.text}));
            return this;
        }
    });

    var NewListTag = Tag.extend({

        hoverHandler: function() {},
        clickHandler: function() {
            this.$el.remove();
            return false;
        },
        initialize: function(text) {
            _.bindAll(this, "render", "clickHandler", "hoverHandler");
            this.text = text;
            this.$el.addClass(getTagLabelClass(text));
            this.render();
        }
    });

    var DragTag = Tag.extend({

        hoverHandler: function() {},
        clickHandler: function() {},

        initialize: function(text) {
            _.bindAll(this, "render", "clickHandler", "hoverHandler");
            this.text = text;
            this.$el.addClass(getTagLabelClass(text));
            this.render();
        }

    });

    var ListLi = Backbone.View.extend({
        tagName: 'li',
        className: 'list-item',

        showIfAllowed: function() {
            var self = this;
            var pattern = App.Mediator.state.searchPattern;
            var matched = (pattern) ? false : true;
            if (pattern) {
                matched = $(self.el).hasClass("selected");
                matched = matched || pattern.test(self.model.get("name"));
                matched = matched || pattern.test(self.model.get("description"));
                matched = matched || pattern.test(self.model.get("title"));
                matched = matched || _(self.model.get("tags")).any(function(t) {
                    return pattern.test(t);
                });
            }
            if (!matched) {
                $(self.el).hide();
            } else {
                var requiredTags = App.Mediator.state.selectedTags;
                var theseTags = self.model.get("tags");
                if (_(requiredTags).isEmpty() || _(requiredTags).all(function(t) {return _(theseTags).include(t);})) {
                    self.$el.show();
                } else {
                    $(self.el).hide();
                }
            }
        },

        listSelected: function(name) {
            if (name === this.model.get("name")) {
                $(this.el).addClass("selected");
                var listDisplay = new ListDisplay({model: this.model});
            } else {
                $(this.el).removeClass("selected");
            }
        },

        tagSelected: function(tagName) {
            if (!(_(this.model.get("tags")).include(tagName) || $(this.el).hasClass("selected"))) {
                $(this.el).hide();
            }
        },

        initialize: function() {
            var self = this;
            _.bindAll(this, 'render', 'show', 'showIfAllowed', 'select', 
                    'listSelected', 'tagSelected');

            this.model.on('change:tags', this.render);
            App.Mediator.bind("list-selected", this.listSelected);
            App.Mediator.bind("tag-selected", this.tagSelected); 
            App.Mediator.bind("tag-removed", this.showIfAllowed);
            App.Mediator.bind("only-my-lists", function() {
                var ts = self.model.get("tags");
                if (_(ts).include("im:public")) {
                    $(self.el).hide();
                }
            });
            App.Mediator.bind("scope-removed", function(scope) {
                if ("user" === scope) {
                    self.showIfAllowed();
                }
            });


            App.Mediator.bind("search-lists", function(pattern) {
                App.Mediator.state.searchPattern = pattern;
                self.showIfAllowed();
            });

            this.model.bind("selection", function() {
                $(self.el).toggleClass("selected"); 
                self.showIfAllowed();
                App.Mediator.trigger($(self.el).hasClass("selected") ? "added-to-selection" : "removed-from-selection", self.model);
            });

            this.model.bind("clear-selection", function() { 
                $(self.el).removeClass("selected");
                App.Mediator.trigger("removed-from-selection", self.model);
            });

        },

        events: {
            'click a': 'show',
            'click': 'select'
        },

        select: function(evt) {
            if (evt.ctrlKey || evt.shiftKey) {
                this.model.trigger("selection");
            } else {
                this.show();
            }
        },

        show: function() {
            App.Mediator.trigger("list-selected", this.model.get("name"));
        },

        addTooltip: function() {
            var self = this;
            $(self.el).attr("title", self.model.get("description"));
            self.$el.tooltip({placement: "right"});
        },


        render: function() {
            var self = this;
            self.$el.empty();
            self.addTooltip();
            $(self.el).append(self.make('a', {href: '#'}, self.model.get('name')));
            $(self.el).append(self.make('span', {}, self.model.get('size') + " " + self.model.get("type") + "s"));
            $(self.el).append(self.make('p', {"class": "description"}, self.model.get('description')));
            var tags = self.model.get('tags');
            var favStar;
            if (_(tags).include('im:favourite')) {
                favStar = self.make('i', {"class": "icon-star tag", "title": "this is one of your favourites"});
                $(favStar).tooltip().click(function() {
                    App.Mediator.trigger("tag-selected", "im:favourite");
                    return false;
                });
            } else {
                favStar = self.make('i', {"class": "icon-star-empty tag"});
                $(favStar).click(function() {App.Mediator.trigger("no-favs")});
            }
            $(self.el).append(favStar);
            if (_(tags).include("im:public")) {
            } else {
                var userIcon = self.make('i', {"class": "icon-user tag", "title": "This list belongs to you"});
                $(userIcon).tooltip().appendTo(self.el).click(function() {
                    App.Mediator.trigger("only-my-lists");
                    return false;
                });
            }
            _(tags).chain()
                .filter(isUserTag)
                .without("im:favourite")
                .each(function(t) {
                    var tag = new Tag(t);
                    self.$el.append(tag.el);
                });
            $(self.el).append(self.make('div', {"style": "clear: both;"}));

            return this;
        },
    });

    var DashBoardCell = ListLi.extend({
        tagName: "div",
        className: "list-item well dashboard-cell",
        addTooltip: function() {},

        initialize: function() {
            var self = this;
            ListLi.prototype.initialize.call(this);
            this.$el.droppable( {
                drop: function(evt, ui) {
                    var draggable = ui.draggable;
                    var tag = $(draggable).find('.tag-text').text();
                    if (_(self.model.get("tags")).include(tag)) {
                        return false;
                    }
                    console.log("You want me to have the tag: " + tag);
                    var name = self.model.get("name");
                    var req = {name: self.model.get("name"), tags: tag};
                    App.im.makeRequest("list/tags", req, null, "POST")
                          .fail(function() { 
                              console.log(arguments);
                              alert("Problem adding tag") 
                          })
                          .done(function() { 
                        App.im.fetchLists(function(ls) {
                            var updated = _(ls).find(function(l) {
                                return l.name === name;
                            });
                            self.model.set("tags", updated.tags);
                        });
                    });
                }
            });
        }
    });

    var ListDisplay = Backbone.View.extend({
        className: 'list-display',

        initialize: function() {
            _.bindAll(this, 'render');
            this.render();
        },

        render: function() {
            var self = this;
            $('#content').empty();
            $(self.el).append(self.make("h2", {}, self.model.get("title")));
            $(self.el).append(self.make("p", {"class": "description"}, self.model.get("description")));
            this.contents = new ListContents({model: self.model});
            this.contents.showGrid();
            $(self.el).append(this.contents.el);

            $('#content').append(self.el);

            return this;
        }
    });


    var ListContents = Backbone.View.extend({
        className: "list-contents",

        events: {
            "click a#grid-btn": "showGrid",
            "click a#table-btn": "showTable",
            "click a#widget-btn": "showWidgets"
        },

        initialize: function() {
            var self = this;
            _.bindAll(this, "render", "showGrid", "showTable", "showWidgets", "getRecordHandler", "makeMorer");
            this.facetView = new FacetView({model: self.model});
            this.render();
            var activeFacets = [];
            this.model.bind("facet-added", function(facet) {
                activeFacets = _.union(activeFacets, [facet]);
                self.showGrid(activeFacets);
            });
            this.model.bind("facet-removed", function(facet) {
                activeFacets = _(activeFacets).without(facet);
                self.showGrid(activeFacets);
            });
        },

        render: function() {
            var self = this;

            var btns = self.make("div", {"class": "btn-group"});
            var btnDetails = [
                ["Grid", "icon-th", "grid-btn"],
                ["Table", "icon-th-list", "table-btn"],
                ["Analysis", "icon-signal", "widget-btn"]
            ];
            _(btnDetails).each(function(pair) {
                var btn = self.make("a", {"class": "btn", "href": "#", "id": pair[2]}, pair[0])
                $(btn).append(self.make("i", {"class": pair[1]}));
                $(btns).append(btn);
            });
            this.showing = self.make("span", {"class": "pull-left"});
            self.$el.append(this.showing);
            $(self.el).append($('<div>').append(btns).append(self.make("div", {"style": "clear: both"})));

            this.progressBar = self.make("div", {"class": "progress progress-info progress-striped active"});
            $(this.progressBar).append(self.make("div", {"class": "bar", "style": "width: 100%"}));
            $(self.el).append(self.progressBar);
            var lowerRegion = self.make("div", {"class": "row-fluid"});
            self.$el.append(lowerRegion);
            $(lowerRegion).append(self.make("div", {"class": "display-area"}))
                          .append(self.facetView.el);
            
            return this;
        },

        getRecordHandler: function(q, c, fields) { var self = this; return function(rs) {
            var addGridItem = function(r) {
                var item = new GridItemView({model: r, fields: fields});
                self.$('.display-area').append(item.el);
            };
            $(self.progressBar).hide();
            _(rs).each(addGridItem);
            if (c > q.start + q.maxRows) {
                self.makeMorer(q, c, fields);
            }
        }},

        makeMorer: function(q, c, fields) {
            var self = this;
            var $morer = $("<span><i class=icon-arrow-down></i>More...</span>");
            $morer.click(function() {
                $(this).remove();
                q.start = q.start + q.maxRows;
                q.records(self.getRecordHandler(q, c, fields));
            });
            self.$('.display-area').append($morer);
        },

        showGrid: function(facets) {
            var self = this;
            facets = _(facets).isArray() ? facets : [];
            this.$('.display-area').empty().addClass("span9");
            $(this.progressBar).show();
            this.$('.btn').removeClass("active");
            this.$('#grid-btn').addClass("active");
            var type = this.model.get("type");
            var name = this.model.get("name");
            var fields = ["symbol"];
            var query = {select: fields, from: type};
            query.where = _(facets).reduce(function(m, f) {m[f.path] = f.value; return m}, {});
            query.where[type] = {IN: name}; 

            var initialLimit = 25;

            App.im.query(query, function(q) {
                q.count(function(c) {
                    $(self.showing).text("Showing " + c + " of " + self.model.get("size"));
                    q.start = 0; // default, doesn't hurt to be explicit.
                    q.maxRows = initialLimit;
                    q.records(self.getRecordHandler(q, c, fields));
                });
            });
            self.facetView.render(query, facets);
        },

        showTable: function() {
            var self = this;
            $(self.showing).empty();
            tableInitialised = {};
            this.$('.btn').removeClass("active");
            this.$('#table-btn').addClass("active");
            this.$('.display-area').empty();
            $(this.progressBar).show();
            var tableId = "displayTable_" + self.model.get("name").toLowerCase().replace(/[^a-z]/, "_");
            var resTable = self.make("div", {"id": tableId}); 
            $(resTable).appendTo('.display-area');
            App.im.fetchSummaryFields(function(sfs) {
                var query = {
                    title: "Items in " + self.model.get("title"),
                    select: sfs[self.model.get("type")],
                    from: "genomic",
                    where: [
                        {path: self.model.get("type"), op: "IN", value: self.model.get("name")}
                    ]
                };
                $(self.progressBar).hide();
                var t = new InterMine.ResultTable(query, App.im.root, tableId, App.im.token);
            });
        },

        showWidgets: function() {
            this.$('.btn').removeClass("active");
            this.$('#widget-btn').addClass("active");
        },

    });

    var extraFields = {
        Gene: ["organism.shortName", "proteins.id", "pathways.id", "chromosome.primaryIdentifier", 
            "length", "primaryIdentifier"],
        Protein: ["gene.symbol", "proteinDomains.identifier"],
    };

    var FACETS = {
        Gene: [
            ["Pathways", "pathways.name"],
            ["Expression Term", "mRNAExpressionResults.mRNAExpressionTerms.name"],
            ["Ontology Term", "ontologyAnnotations.ontologyTerm.name"],
            ["Diseases", "diseases.name"],
            ["Organisms", "organism.name"]
        ]
    };

    var FacetView = Backbone.View.extend({

        className: "span3",
        id: "facet-bar",

        initialize: function() {
            _.bindAll(this, "render");
        },

        render: function(query, activeFacets) {
            var self = this;
            var limit = 10;
            self.$el.empty();
            activeFacets = activeFacets || [];
            self.$el.append(self.make("h3", {}, "Facets"));
            var searchFacets = self.make("input", {"class": "input-long", "placeholder": "Filter facets.."})
            self.$el.append(searchFacets);
            $(searchFacets).keyup(function() {
                var term;
                if (term = $(this).val()) {
                    var pattern = new RegExp(term, "i");
                    self.$('dd').each(function() {
                        var text = $(this).text();
                        if (pattern.test(text)) {
                            $(this).show();
                        } else {
                            $(this).hide();
                        }
                    });
                } else {
                    self.$('dd').show();
                }
            });

            if (!_(activeFacets).isEmpty()) {
                var $infoBox = $(Assets.FacetView.infoBox);
                var ft = Assets.FacetView.facetT;
                _(activeFacets).each(function(f) {
                    var af = self.make("li", {"class": "active-facet"}, ft(f));
                    $(af).click(function() { self.model.trigger("facet-removed", f)});
                    $infoBox.find('ul').append(af);
                });
                self.$el.append($infoBox);
                $(Assets.FacetView.newListButton).appendTo(self.el).click(
                    function() {
                       var $diag = $('#list-creation-diag');
                       var $tbox = $diag.find('.inherited-tags')
                                        .empty();
                       $diag.find('.alert').hide();
                       $diag.find('.btn').removeClass("disabled");
                       var tags = self.model.get("tags");
                       __(tags).filter(isUserTag).each(function(t) {
                           var tag = new NewListTag(t);
                           $tbox.append(tag.el);
                       });
                       // Add tags for active facets
                       _(activeFacets).each(function(af) {
                           var tag = new NewListTag(af.name + ":" + af.value);
                           $tbox.append(tag.el);
                       });


                       var tagFormAdder = function() {
                           var $tagForm = $(Assets.FacetView.newTagInput);
                           $tagForm.appendTo($tbox);
                           $tbox.unbind("click"); /*.click(function(evt) {
                               if (evt.currentTarget.nodeName == "FORM") {
                                   return;
                               }
                               console.log(evt.currentTarget.nodeName);
                               $tagForm.remove();
                               $tbox.click(tagFormAdder);
                               return false;
                           }); */
                           $tagForm.submit(function() {
                               var $input = $tagForm.find("input");
                               var tagName = $input.val();
                               if (!tagName) {
                                   $tagForm.find("fieldset").addClass("error")
                                    .append(Assets.FacetView.newTagMissingError);
                               } else {
                                   var newTag = new NewListTag(tagName);
                                   $tbox.append(newTag.el);
                                   $tagForm.remove();
                                   $tbox.unbind("click").click(tagFormAdder);
                               }
                               return false;
                           });
                       };
                       $tbox.click(tagFormAdder);
                       $diag.find('.btn-cancel').click(function() {
                           $diag.modal('hide');
                       });
                       $diag.find('.btn-primary').click(function() {
                           $diag.find('.btn').unbind('click').addClass("disabled");
                           $diag.find('.progress').show();
                           var $nld = $diag.find('#new-list-details');
                           var name = $nld.find('input[name~="name"]').val();
                           var desc = $nld.find('input[name~="desc"]').val();
                           var tags = $tbox.find('.tag-text').map(function() {
                               return $(this).text();
                           }).get();
                           var details = {
                               name: name, 
                               description: desc, 
                               tags: tags
                           };
                           var success = function() {
                               $diag.find('.progress').hide();
                               $diag.modal('hide');
                               new ListsView(true);
                           };
                           var error = function() {
                               $diag.find('.progress').hide();
                               $diag.find('.alert').show();
                           };

                           App.im.query(query, function(q) {
                                q.saveAsList(details).then(success, error);
                           });
                       });
                    }
                );
            }

            var dl = self.make("dl");
            self.$el.find("h3").click(function() {
                $(this).siblings().toggle();
                self.$el.toggleClass("span3 span1");
                self.$el.prev().toggleClass("span9 span11");

            });
            this.$el.append(dl);
            var type = self.model.get("type");
            var clsFacets = FACETS[type];
            var facetTemp = _.template('<dd><a href=#><b class=pull-right>(<%= count %>)</b><%= item %></a></dd>');
            if (clsFacets) {
                __(clsFacets).filter(function(pair) {
                                return !_(activeFacets).any(function(af) {return af.path === pair[1]})})
                            .each(function(pair) {
                    var dt = self.make("dt", {}, pair[0])
                    $(dt).click(function() {
                        $(this).nextUntil("dt").slideToggle();
                    });
                    $(dl).append(dt);
                    var insertionPoint = dt;

                    var itemHandler = function(i) {
                        var $dd = $(facetTemp(i));
                        $(insertionPoint).after($dd);
                        insertionPoint = $dd;
                        var facet = {path: pair[1], value: i.item, name: pair[0]};
                        $dd.click(function() {self.model.trigger("facet-added", facet)});
                    };
                    App.im.query(query, function(q) {
                        q.summarise(pair[1], limit, function(items, total) {
                            $(dt).append(" (" + total + ")");
                            if (total > limit) {
                                var $morer = $('<i class="icon-plus-sign pull-right" title="Showing top ten. Click to see all values"></i>');
                                $morer.tooltip({placement: "left"}).appendTo(dt).click(function() {
                                    insertionPoint = dt;
                                    $(dt).nextUntil("dt").remove();
                                    q.summarise(pair[1], function(items) {
                                        _(items).each(itemHandler);
                                    });
                                    $(this).tooltip('hide').remove();
                                });
                            }
                            _(items).each(itemHandler);
                        });
                    });
                });
            }
        }
    });


    var GridItemView = Backbone.View.extend({
        className: "grid-item well",

        initialize: function() {
            _.bindAll(this, "render");

            this.render();
        },

        render: function() {
            var self = this;
            var extras;
            _(this.options.fields).each(function(f) {
                var val = self.model[f];
                $(self.el).append(self.make("span", {"class": "field primary", "title": f}, val));
            });
            if (extras = extraFields[self.model.class]) {
                var joins = __(extras).map(function(p) {return p.split(".")})
                                      .filter(function(ps) {return ps.length > 1})
                                      .map(function(ps) {return ps[0]}).value();
                var query = {
                    select: extras, 
                    from: self.model.class, 
                    where: {id: self.model.objectId},
                    joins: joins
                };
                received = window.received || [];
                App.im.query(query, function(q) {
                    q.records(function(recs) {
                        var rec = recs[0];
                        if (rec) {
                            received.push(rec);
                            __(rec).keys().each(function(prop) {
                                var o = rec[prop];
                                self.model[prop] = o; // Update the model.
                                var attrs = {"class": "field", "title": prop};
                                if (_(o).isArray()) {
                                } else if ( o && o["objectId"]) {
                                    $(self.el).append(self.make("span", attrs, 
                                            __(o).map(function(v, k) {return [k, v]})
                                                 .filter(function(kv) {return !_(["class", "objectId"]).include(kv[0])})
                                                 .map(function(kv) {return kv[1]})
                                                 .value().join(" ")));
                                } else if (o && !_(["class", "objectId"]).include(prop)) {
                                    $(self.el).find('.field.primary').after(self.make("span", attrs, o));
                                }
                            });
                            __(rec).keys().each(function(prop) {
                                var o = rec[prop];
                                if (o && _(o).isArray()) {
                                    var attrs = {"class": "field collection", "title": prop};
                                    $(self.el).append(self.make("span", attrs, o.length + " " + prop));
                                }
                            });
                        }
                    });
                });
            }
            return this;
        }
    });

    var DashBoardHeader = Backbone.View.extend({

        className: "btn-toolbar",

        initialize: function() {
            var self = this;

            _.bindAll(this, "render", "setEnabledState");
            self.render();
        },

        setEnabledState: function() {
            if ($('.list-item.selected').length) {
                this.$('.btn-group a.needs-input').removeClass("disabled");
            } else {
                this.$('.btn-group a.needs-input').addClass("disabled");
            }
        },

        render: function() {
            var self = this;
            var $listCombiners = $(Assets.DashBoardHeader.listOperations);
            $listCombiners.find('li a').click(function() {
                $listCombiners.find('#combine-main').text($(this).text());
            });
            $listCombiners.appendTo(self.el).tooltip({
                selector: 'a', 
                placement: 'left'
            });

            var $deleter = $(Assets.DashBoardHeader.deleter).appendTo(self.el);

            var $selectionControls = $(Assets.DashBoardHeader.selectionButtons)
                                        .appendTo(self.el);
            $selectionControls.find('.clearer').click(function() {
                self.collection.each(function(list) {
                    list.trigger("clear-selection")
                });
            });
            $selectionControls.find('.toggler').click(function() {
                self.collection.each(function(list) {list.trigger("selection")});
            });
            self.collection.bind("selection", self.setEnabledState);
            self.collection.bind("clear-selection", self.setEnabledState);
            // Heading
            self.$el.append(self.make("h2", {}, "Lists in FlyMine"));
            $deleter.find('a').popover({placement: 'bottom'})
                    .click(function() {$(this).popover('hide')})
                    .click(function() {if (!$(this).hasClass('disabled')) {
                        var selector = $(this).attr('href');
                        $(selector).modal('show');
                    } });
            return self;
        }

    });

    var ListDashBoard = Backbone.View.extend({

        initialize: function() {
            _.bindAll(this, "render");
            this.setElement(document.getElementById("content"));
            this.$el.empty();
            this.render();
            var tagChangeHandler = function() {
                if (self.$('.dashboard-cell').filter(':visible').length < 1) {
                    self.$('.absence-message').show();
                } else {
                    self.$('.absence-message').hide();
                }
            };
            App.Mediator.bind("tag-selected", tagChangeHandler);
            App.Mediator.bind("tag-removed", tagChangeHandler);
        },

        render: function() {
            var self = this;
            var toolBar = new DashBoardHeader({collection: self.collection});
            self.$el.append(toolBar.el);
            var mainContent = self.make("div", {"class": "row-fluid"});
            var dashBoard = self.make("div", {"class": "dashboard span10"});
            $(dashBoard).append('<h1 class="absence-message">no lists</h3>');
            $(mainContent).append(dashBoard);
            var tagBox = self.make("div", {"class": "seen-tags span2"});
            $(tagBox).append('<h3><i class=icon-tags></i>&nbsp;Tags</h3>');
            _(seen_tags).each(function(t) {
                var tag = new Tag(t, {collapsible: false});
                $(tagBox).append(tag.el);
                tag.$el.draggable( {
                    cursor: 'move', 
                    containment: 'document',
                    helper: function() { return new DragTag(t).el }
                });
            });
            $(mainContent).append(tagBox);
            self.$el.append(mainContent);
            self.collection.each(function(list) {
                var cell = new DashBoardCell({model: list});
                $(dashBoard).append(cell.render().el);
            });
            return this;
        }
    });

    var ListsView = Backbone.View.extend({

        initialize: function(noDash) {
            this.setElement(document.getElementById('lists'));
            var self = this;
            _.bindAll(this, 'render', 'appendList', 'showDashBoard'); // all "methods" listed here.

            this.collection = new Lists();
            this.collection.bind('add', this.appendList);

            App.Mediator.state.selectedTags = [];

            this.render(!noDash);

            App.Mediator.bind("tag-selected", function(tag) {
                App.Mediator.state.selectedTags = _.union(App.Mediator.state.selectedTags, [tag]);
                self.renderSelectedTags();
            });

            App.Mediator.bind("tag-removed", function(tag) {
                App.Mediator.state.selectedTags = _(App.Mediator.state.selectedTags).without(tag);
                self.renderSelectedTags();
            });

            App.Mediator.bind("only-my-lists", function() {
                App.Mediator.state.scope = "user";
                self.renderSelectedTags();
            });

            App.Mediator.bind("scope-removed", function(scope) {
                App.Mediator.state.scope = null;
                self.renderSelectedTags();
            });

        },

        // TODO: should be own view...
        showDashBoard: function() {
            var self = this;
            new ListDashBoard({collection: self.collection});
            return this;
        },

        renderSelectedTags: function() {
            var self = this;
            var tagsOfInterest = App.Mediator.state.selectedTags;
            $('#lists').find(".alert").remove();
            if (tagsOfInterest.length || App.Mediator.state.scope) {
                var infoBox = self.make("div", {"class": "alert alert-info"});
                var scope = App.Mediator.state.scope;
                $(infoBox).append(self.make("h4", {}, "Filtering on the following tags"));
                $(infoBox).append(self.make("p", {}, "click a tag to remove it from the filter"));

                if (scope) {
                    var scopeTag = self.make("i", {"class": "icon-" + scope, title: SCOPE_TITLES[scope]});
                    $(scopeTag).tooltip({placement: "right"})
                               .appendTo(infoBox)
                               .click(function () {$(this).tooltip('hide')}) // must be first.
                               .click(publisher("scope-removed", scope));
                };

                _(tagsOfInterest).each(function(t) {
                    var tag;
                    if (t === "im:favourite") {
                        tag = self.make("i", {"class": "icon-star"});
                    } else {
                        var lc = getTagLabelClass(t);
                        var tag = self.make("span",  {"class": "label " + lc}, t);
                        $(tag).append(self.make("i", {"class": "icon-tag icon-white"}));
                    }
                    $(tag).appendTo(infoBox).click(publisher("tag-removed", t));
                });
                $('#lists').prepend(infoBox);
            }

            return self;
        },

        render: function(showDash) {
            var self = this;
            $('#lists').empty();
            var tagsOfInterest = App.Mediator.state.selectedTags;
            self.renderSelectedTags();
            self.collection.reset();
            App.im.fetchLists(function(ls) {
                _(ls).each(function(l) {
                    var requiredTags = tagsOfInterest.length ? tagsOfInterest : l.tags;
                    if (l.size && _(requiredTags).all(function(t) {return _(l.tags).include(t);})) {
                        self.collection.add(l);
                    }
                });
                if (self.collection.size() == 1) {
                    var selected = self.collection.first();
                    App.Mediator.trigger("list-selected", selected.get("name"));
                } else {
                    if (showDash) {
                        self.showDashBoard();
                    }
                }
            });
        },

        appendList: function(list) {
            var listView = new ListLi({model: list});
            $('#lists').append(listView.render().el);
        }
    });

    var TemplatesView = Backbone.View.extend({
         initialize: function() {
            _.bindAll(this, "render", "appendTemplate");
            this.el = $('#lists').empty();

            this.collection = new Templates();
            this.collection.bind("add", this.appendTemplate);

            this.render();
            return this;
        },

        render: function() {
            var self = this;
            App.im.fetchTemplates(function(ts) {
                _(ts).each(function(t) {
                    self.collection.add(t);
                });
            });
        },

        appendTemplate: function(template) {
            var tv = new TemplateLiView({model: template});
            this.el.append(tv.el);
        }
    });

    var TemplateLiView = Backbone.View.extend({
        tagName: "li",
        className: "template",

        initialize: function() {
            var self = this;
            _.bindAll(this, "render", "show");
            App.Mediator.bind("search-lists", function(pattern) {
                var props = ["name", "title", "description", "comment"];
                var matched = _(props).any(function(p) {return pattern.test(self.model.get(p))});
                if (!matched) {
                    $(self.el).hide();
                } else {
                    $(self.el).show();
                }
            });

            this.render();
            return this;
        },

        render: function() {
            var self = this;
            var $el = $(self.el);
            $el.attr("title", self.model.get("description"));
            $el.append(self.make("a", {"href": "#"}, self.model.get("title").replace("-->", "&rarr;")));
            return this;
        },

        events: {
            'click': 'show'
        },

        show: function() {
            new TemplateCentreDisplay({model: this.model});
        }

    });

    var constraintOps = [
        "=", "!=", ">", ">=", "<", "<=", 
        "CONTAINS", "LOOKUP", "IN", "NOT IN", 
        "IS NULL", "IS NOT NULL", "ONE OF", "NONE OF"
    ];

    var TemplateCentreDisplay = Backbone.View.extend({

        initialize: function() {
            _.bindAll(this, "render");
            this.render();

            this.model.bind("change", this.render);
        },

        render: function() {
            var self = this;
            this.el = $('#content').empty();
            var $el = this.el;

            $el.append(self.make("h2", {}, self.model.get("title").replace("-->", "&rarr;")));
            $el.append(self.make("p", {"class": "description"}, self.model.get("description")));

            var cons = self.make("div", {"class": "editable-constraints"});
            _(self.model.get("constraints")).each(function(con, conIdx) {
                var pathBox = self.make("ul", {"class": "breadcrumb con-elem con-path span5"});
                _(con.path.split(".")).each(function(x, idx, xs) {
                    var $li = $('<li>').text(x);
                    if (idx < (xs.length - 1)) {
                        $li.append($('<span>').addClass("divider").text(">"));
                    }
                    $(pathBox).append($li);
                });
                var conBox = self.make("div", {"class": "well"});
                var opGroup;
                if (con.op === "LOOKUP") {
                    opGroup = self.make("span",{"class": "con-op span2"}, con.op);
                } else {
                    opGroup = self.make("div", {"class": "btn-group con-elem con-op span2"});
                    var initialLink = self.make("a", {"class": "btn dropdown-toggle span11", "data-toggle": "dropdown", "href": "#"}, con.op);
                    $(initialLink).append(self.make("span", {"class": "caret"}));
                    var otherOps = self.make("ul", {"class": "dropdown-menu"});
                    $(opGroup).append(initialLink).append(otherOps);
                    var opTem = _.template('<li><a href="#"><%= op %></a>');
                    _(constraintOps).each(function(co) {
                        $(otherOps).append(opTem({op: co}));
                    });
                    $(opGroup).find('li a').click(function() {
                        self.model.get("constraints")[conIdx].op = $(this).text();
                        self.model.trigger("change");
                    });
                }

                var valueLabel = self.make("input", {"type": "text", "class": "span4 input-long con-value con-elem", "value": con.value});

                $(valueLabel).change(function() {
                    self.model.get("constraints")[conIdx].value = $(this).val();
                    self.model.trigger("change");
                });

                $(conBox).append(pathBox).append(opGroup).append(valueLabel).appendTo(cons);
            });

            $el.append(cons);
            var runner = self.make("div", {"class": "btn btn-large btn-primary"}, "See Results");
            var $counter = $('<span>').appendTo(runner);
            var type = (_(_(self.model.get("view")).first().split(".")).first());
            App.im.query({select: self.model.get("view"), from: type, where: self.model.get("constraints")},
                    function(q) {
                        q.count(function(c) {
                            $counter.html("&nbsp;(" + c + " rows)");
                        });
                    });

            
            $(runner).click(function() {
                var query = {
                    select: self.model.get("view"),
                    from: "genomic",
                    where: self.model.get("constraints")
                };
                self.$('.editable-constraints').slideUp();
                $(this).slideUp();
                var t = new InterMine.ResultTable(query, App.im.root, "template-results-table", App.im.token);
            });

            $el.append(runner);
            $el.append($('<div id="template-results-table">'));

            return this;
        }

    });

    var SelectedLists = Backbone.Collection.extend({

        comparator: function(list) {
            return list.get("name");
        },

        initialize: function() {
            var self = this;
            this.bind("add", function() {
                self.models = _(self.models).uniq(true, function(x) {return x.get("name")});
            });
        },

        listsToDelete: function() {
            return this.filter(function(l) {return !_(l.get("tags")).include("im:public")});
        },

    });

    var ListsModal = Backbone.View.extend({

        initialize: function() {
            var self = this;
            self.setElement(document.getElementById("confirm-delete"));
            _.bindAll(this, "populateUL");
            this.collection = new SelectedLists();
            this.collection.bind("add", this.populateUL);
            this.collection.bind("remove", this.populateUL);
            App.Mediator.bind("added-to-selection", function(list) {
                try {
                    self.collection.add(list);
                } catch (e) {
                    if (/to a collection twice/.test(e.message)) {
                        // Ignore dups
                    } else {
                        throw e;
                    }
                }
            });
            App.Mediator.bind("removed-from-selection", function(list) {
                self.collection.remove(list);
            });
            this.$('a.close').click(function() {self.$('div.alert').slideToggle()});
            this.$('a.btn-cancel').click(function() {self.$el.modal('hide')});
        },

        populateUL: function() {
            var self = this;
            var $ul = $('#lists-to-delete').empty();
            var $nul = $('#lists-we-cannot-delete').empty();
            var $alerts = this.$('.alert').hide();
            var templ = _.template('<li class=delendum><%= name %> (<%= size %> <%= type %>s)</li>');
            self.collection.each(function(list) {
                li = templ(list.attributes);
                if (_(list.get("tags")).include("im:public")) {
                    $nul.append(li);
                    $alerts.show();
                } else {
                    $ul.append(li);
                }
            });
        },

    });

    var QueryBuilder = Backbone.View.extend({

        className: "query-builder",

        initialize: function() {
            _.bindAll(this, "render", "getDijitModel", "highlightNodesInView",
                "loadQueryTable");
            var self = this;
            var root = this.model.get("rootClass");
            this.subclasses = new Backbone.Model(); // So we can listen to events.
            this.render();
            App.im.fetchSummaryFields(function(sfs) {
                self.query = {select: sfs[root], from: root};
                self.loadQueryTable();
            });
        },

        loadQueryTable: function() {
            var self = this;
            var q = _.clone(self.query);
            q.from = "genomic"; // TODO!! unify query format.
            console.log(q);
            self.$('#query-results-table').empty();

            tableInitialised = {};
            new InterMine.ResultTable(q, App.im.root, 'query-results-table', App.im.token);
        },

        getDijitModel: function() {
            var self = this;
            var dm = new dojo.store.JsonRest({
                rootCls: self.model.get("rootClass"),
                target: App.im.root + "model/",
                mayHaveChildren: function(obj) { return "fields" in obj },
                getChildren: function(obj, onComplete, onError) {
                    this.get(obj.id).then(function(fullObj) {
                        obj.fields  = fullObj.fields;
                        onComplete(fullObj.fields);
                    }, onError);
                },
                get: function(id) {
                    opts = self.subclasses.toJSON();
                    id = id + "?" + $.param(opts); 
                    return dojo.store.JsonRest.prototype.get.bind(this, id)();
                },
                getRoot: function(onItem, onError) { 
                    this.get(this.rootCls).then(onItem, onError) 
                },
                getLabel: function(obj) { return obj.name },
            });
            return dm;
        },

        render: function() {
            var self = this;
            if (self.tree) {
                self.tree.destroyRecursive();
            }
            self.$el.empty();
            self.tree = new dijit.Tree({
                model: self.getDijitModel(),
                autoExpand: false,
                title: "Data Schema",
                persist: false,
                //id: "tree",
                getLabelClass: function(item, isOpen) {
                    return item.id.replace(/\./g, '-');
                },
                onClick: function(obj, node, evt) {
                    if ("fields" in obj) {return;}
                    if (!_(self.query.select).include(obj.id)) {
                        self.query.select.push(obj.id);
                        self.loadQueryTable();
                    }
                },
                onOpen: self.highlightNodesInView,
                onMouseDown: function(evt) {
                    selectedItem = dijit.getEnclosingWidget(evt.target).item;
                }
            }, document.createElement("div"));
            var $d = $('<div id=tree-container class=nihilo>').appendTo(self.el);
            $d.append(self.tree.domNode);
            self.tree.startup();
            self.$el.append(self.make("div", {id: "query-results-table"}));
            return self;
        },

        highlightNodesInView: function() {
            var self = this;
            _(self.query.select).each(function(col) {
                var nodeClass = col.replace(/\./g, "-");
                self.$('.' + nodeClass).addClass("in-view");
            });
        },

    });

    var query_blurb = "You can create and run your own queries on any of the data within FlyMine. Select the kind of data you want to find, and start searching. You can also"
        + " use any of the predefined queries on the left as your starting point";

    var QueryView = Backbone.View.extend({

        initialize: function() {
            this.setElement(document.getElementById('content'));
            _.bindAll(this, "render", "startQuery");
            this.model = new Backbone.Model({rootClass: "Gene"});
            this.render();
        },

        events: {
            'click a.query-starter': 'startQuery'
        },

        startQuery: function() {
            console.log("Starting query on " + this.model.get("rootClass"));
            if (!this.qb) {
                this.qb = new QueryBuilder({model: this.model});
                this.$el.append(this.qb.el);
            }
            this.qb.render();
        },

        render: function() {
            var self = this;
            this.$el.empty();
            var hero = this.make("div", {"class": "hero-unit"});
            var btnGrpT = _.template('<div class=btn-group><a class="btn btn-primary btn-large query-starter" href="#">Find <span id=starting-cls><%= cls %></span>s</a><a class="btn btn-large btn-primary dropdown-toggle" data-toggle=dropdown href="#"><span class=caret></span></a><ul class=dropdown-menu></ul></div>');
            var clsLineTempl = _.template('<li><a href="#"><%= cls %></a></li>');
            var $btnGrp = $(btnGrpT({cls: self.model.get("rootClass")}));
            $(hero).append(this.make("h1", {}, "Search FlyMine"))
                   .append(this.make("p", {}, query_blurb))
                   .append($btnGrp)
                   .appendTo(this.el);

            App.im.fetchModel(function(m) {
                self.model.set("schema", m.classes);
                __(m.classes).map(function(cls) {return cls.name}).sort().each(function(name) {
                    // TODO: make the model provide names en masse.
                    var table = self.model.get("schema")[name];
                    var lineMaker = function(n) {
                        $(clsLineTempl({cls: n})).click(function() {
                            $btnGrp.find('#starting-cls').text(n);
                            self.model.set("rootClass", table.name);
                        }).appendTo($btnGrp.find('ul'));
                    };
                    if (table.displayName) {
                        lineMaker(table.displayName);
                    } else {
                        App.im.makeRequest("model/" + name, null, function(data) {
                            table.displayName = data.name;
                            lineMaker(data.name);
                        });
                    }
                });
            });
            return this;
        }

    });


    dojo.require("dojo.store.JsonRest");
    dojo.require("dijit.Tree");
    dojo.require("dijit.Menu");

    var init = function() {
        var listsView = new ListsView();
        var listsModal = new ListsModal();

        $('#sidebar-hider').click(function() {
            $('#lists').animate({width: "toggle"}, 100);
            $('#list-search').toggle();
            $('#sidebar-left').toggleClass('span3 minimized');
            $('#content').toggleClass('span9 span11');
            $(this).toggleClass("icon-backward icon-forward pull-right");
        });

        $('#service-switcher').find('li').click(function() {
            App.im = new intermine.Service(services[$(this).text()]);
            $('#services-selector').find('li').toggleClass('active');
            $('.entry-points li').removeClass("active");
            $('.entry-points li').first().addClass("active");
            listsView.render(true);
        });

        $('#list-search').keyup(function() {
            App.Mediator.trigger("search-lists", new RegExp($(this).val(), "i"));
        });
        $('#templates-page').click(function() {
            $('.entry-points li').removeClass("active");
            $(this).addClass("active");
            new TemplatesView();
            new QueryView();
        });

        $('#lists-page').click(function() {
            $('.entry-points li').removeClass("active");
            $(this).addClass("active");
            listsView.render(true);
        });

    };

    $( init );

}).call(this);
