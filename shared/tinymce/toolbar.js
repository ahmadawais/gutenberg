( function( tinymce ) {
	tinymce.ui.svgbutton = tinymce.ui.Button.extend( {
		renderHtml: function() {
			var id = this._id;
			var prefix = this.classPrefix;
			var icon = this.state.get( 'icon' );
			var text = this.state.get( 'text' );
			var html = '';

			if ( icon && icon.indexOf( 'gridicons-' ) === 0 ) {
				html += (
					'<svg width="24" height="24" class="gridicon ' + icon + '">' +
						'<use xlink:href="../shared/gridicons.svg#' + icon + '"></use>' +
					'</svg>'
				);
			} else if ( icon ) {
				html += '<i class="' + prefix + 'ico ' + prefix + 'i-' + icon + '"></i>';
			}

			if ( text ) {
				this.classes.add( 'btn-has-text' );
				html += '<span class="' + prefix + 'txt">' + this.encode( text ) + '</span>';
			}

			return (
				'<div id="' + id + '" class="' + this.classes + '" tabindex="-1" aria-labelledby="' + id + '">' +
					'<button role="presentation" type="button" tabindex="-1">' +
						html +
					'</button>' +
				'</div>'
			);
		},
		bindStates: function() {
			var $el = this.$( this.getEl() );

			this._super();

			this.state.on( 'change:icon', function( event ) {
				var icon = event.value;
				var $i = $el.find( 'i' );
				var $svg = $el.find( 'svg' );

				if ( icon && icon.indexOf( 'gridicons-' ) === 0 ) {
					$i.remove();
					$svg.find( 'use' ).attr( 'xlink:href', '../shared/gridicons.svg#' + icon );
				} else {
					$svg.remove();
				}
			} );

			return this;
		}
	} );

	tinymce.PluginManager.add( 'toolbar', function( editor ) {
		var each = tinymce.each;
		var DOM = tinymce.DOM;

		editor.on( 'preinit', function() {
			var Factory = tinymce.ui.Factory,
				settings = editor.settings,
				activeToolbar,
				currentSelection,
				timeout,
				container = editor.getContainer();

			function create( buttons, bottom ) {
				var toolbar,
					toolbarItems = [],
					buttonGroup;

				each( buttons, function( item ) {
					var itemName;

					function bindSelectorChanged() {
						var selection = editor.selection;

						if ( itemName === 'bullist' ) {
							selection.selectorChanged( 'ul > li', function( state, args ) {
								var i = args.parents.length,
									nodeName;

								while ( i-- ) {
									nodeName = args.parents[ i ].nodeName;

									if ( nodeName === 'OL' || nodeName == 'UL' ) {
										break;
									}
								}

								item.active( state && nodeName === 'UL' );
							} );
						}

						if ( itemName === 'numlist' ) {
							selection.selectorChanged( 'ol > li', function( state, args ) {
								var i = args.parents.length,
									nodeName;

								while ( i-- ) {
									nodeName = args.parents[ i ].nodeName;

									if ( nodeName === 'OL' || nodeName === 'UL' ) {
										break;
									}
								}

								item.active( state && nodeName === 'OL' );
							} );
						}

						if ( item.settings.stateSelector ) {
							selection.selectorChanged( item.settings.stateSelector, function( state ) {
								item.active( state );
							}, true );
						}

						if ( item.settings.disabledStateSelector ) {
							selection.selectorChanged( item.settings.disabledStateSelector, function( state ) {
								item.disabled( state );
							} );
						}
					}

					if ( item === '|' ) {
						buttonGroup = null;
					} else {
						if ( Factory.has( item ) ) {
							item = {
								type: item
							};

							if ( settings.toolbar_items_size ) {
								item.size = settings.toolbar_items_size;
							}

							toolbarItems.push( item );

							buttonGroup = null;
						} else {
							if ( ! buttonGroup ) {
								buttonGroup = {
									type: 'buttongroup',
									items: []
								};

								toolbarItems.push( buttonGroup );
							}

							if ( editor.buttons[ item ] ) {
								itemName = item;
								item = editor.buttons[ itemName ];

								if ( typeof item === 'function' ) {
									item = item();
								}

								item.type = item.type || 'svgbutton';

								if ( settings.toolbar_items_size ) {
									item.size = settings.toolbar_items_size;
								}

								item = Factory.create( item );

								buttonGroup.items.push( item );

								if ( editor.initialized ) {
									bindSelectorChanged();
								} else {
									editor.on( 'init', bindSelectorChanged );
								}
							}
						}
					}
				} );

				toolbar = Factory.create( {
					type: 'panel',
					layout: 'stack',
					classes: 'toolbar-grp inline-toolbar-grp',
					ariaRoot: true,
					ariaRemember: true,
					items: [ {
						type: 'toolbar',
						layout: 'flow',
						items: toolbarItems
					} ]
				} );

				toolbar.bottom = bottom;

				function reposition() {
					if ( ! currentSelection ) {
						return this;
					}

					var scrollX = window.pageXOffset || document.documentElement.scrollLeft,
						scrollY = window.pageYOffset || document.documentElement.scrollTop,
						windowWidth = window.innerWidth,
						windowHeight = window.innerHeight,
						toolbar = this.getEl(),
						toolbarWidth = toolbar.offsetWidth,
						toolbarHeight = toolbar.clientHeight + 10,
						selection = currentSelection.getBoundingClientRect(),
						selectionMiddle = ( selection.left + selection.right ) / 2,
						buffer = 5,
						spaceNeeded = toolbarHeight + buffer,
						spaceTop = selection.top,
						spaceBottom = windowHeight - selection.bottom,
						editorHeight = windowHeight,
						className = '',
						top, left;

					if ( spaceTop >= editorHeight || spaceBottom >= editorHeight ) {
						this.scrolling = true;
						this.hide();
						this.scrolling = false;
						return this;
					}

					if ( this.bottom ) {
						if ( spaceBottom >= spaceNeeded ) {
							className = ' mce-arrow-up';
							top = selection.bottom + scrollY;
						} else if ( spaceTop >= spaceNeeded ) {
							className = ' mce-arrow-down';
							top = selection.top + scrollY - toolbarHeight;
						}
					} else {
						if ( spaceTop >= spaceNeeded ) {
							className = ' mce-arrow-down';
							top = selection.top + scrollY - toolbarHeight;
						} else if ( spaceBottom >= spaceNeeded && editorHeight / 2 > selection.bottom ) {
							className = ' mce-arrow-up';
							top = selection.bottom + scrollY;
						}
					}

					if ( typeof top === 'undefined' ) {
						top = scrollY + buffer;
					}

					left = selectionMiddle - toolbarWidth / 2 + scrollX;

					if ( selection.left < 0 || selection.right > windowWidth ) {
						left = scrollX + ( windowWidth - toolbarWidth ) / 2;
					} else if ( toolbarWidth >= windowWidth ) {
						className += ' mce-arrow-full';
						left = 0;
					} else if ( ( left < 0 && selection.left + toolbarWidth > windowWidth ) || ( left + toolbarWidth > windowWidth && selection.right - toolbarWidth < 0 ) ) {
						left = ( windowWidth - toolbarWidth ) / 2;
					} else if ( left < scrollX ) {
						className += ' mce-arrow-left';
						left = selection.left + scrollX;
					} else if ( left + toolbarWidth > windowWidth + scrollX ) {
						className += ' mce-arrow-right';
						left = selection.right - toolbarWidth + scrollX;
					}

					toolbar.className = toolbar.className.replace( / ?mce-arrow-[\w]+/g, '' ) + className;

					DOM.setStyles( toolbar, {
						'left': left,
						'top': top
					} );

					return this;
				}

				toolbar.on( 'show', function() {
					this.reposition();
				} );

				toolbar.on( 'keydown', function( event ) {
					if ( event.keyCode === 27 ) {
						this.hide();
						editor.focus();
					}
				} );

				editor.on( 'remove', function() {
					toolbar.remove();
				} );

				toolbar.reposition = reposition;
				toolbar.hide().renderTo( document.body );

				return toolbar;
			}

			editor.shortcuts.add( 'alt+119', '', function() {
				var node;

				if ( activeToolbar ) {
					node = activeToolbar.find( 'toolbar' )[0];
					node && node.focus( true );
				}
			} );

			editor.on( 'nodechange', function( event ) {
				// This can move the carect unexpectedly!
				// event.element.normalize();

				var range = editor.selection.getRng()

				var empty = (
					editor.dom.isEmpty( event.element ) &&
					( event.element.nodeName === 'P' || (
						event.element.nodeName === 'BR' &&
						event.element.parentNode.nodeName === 'P'
					) )
				);

				var args = {
					element: event.element,
					empty: empty,
					parents: event.parents,
					range: range,
				};

				editor.fire( 'wptoolbar', args );

				currentSelection = args.selection || args.element;

				if ( activeToolbar && activeToolbar !== args.toolbar ) {
					activeToolbar.hide();
				}

				if ( args.toolbar ) {
					if ( activeToolbar !== args.toolbar ) {
						activeToolbar = args.toolbar;
						activeToolbar.show();
					} else {
						activeToolbar.reposition();
					}
				} else {
					activeToolbar = false;
				}
			} );

			editor.on( 'focus', function() {
				if ( activeToolbar ) {
					activeToolbar.show();
				}
			} );

			function hide( event ) {
				if ( activeToolbar ) {
					if ( activeToolbar.tempHide || event.type === 'hide' ) {
						activeToolbar.hide();
						activeToolbar = false;
					// } else if ( (
					// 	event.type === 'resizewindow' ||
					// 	event.type === 'scrollwindow' ||
					// 	event.type === 'resize' ||
					// 	event.type === 'scroll'
					// ) && ! activeToolbar.blockHide ) {
					// 	clearTimeout( timeout );

					// 	timeout = setTimeout( function() {
					// 		if ( activeToolbar && typeof activeToolbar.show === 'function' ) {
					// 			activeToolbar.scrolling = false;
					// 			activeToolbar.show();
					// 		}
					// 	}, 250 );

					// 	activeToolbar.scrolling = true;
					// 	activeToolbar.hide();
					}
				}
			}

			// For full height editor.
			editor.on( 'resizewindow scrollwindow', hide );
			// For scrollable editor.
			editor.dom.bind( editor.getWin(), 'resize scroll', hide );

			editor.on( 'remove', function() {
				editor.off( 'resizewindow scrollwindow', hide );
				editor.dom.unbind( editor.getWin(), 'resize scroll', hide );
			} );

			editor.on( 'blur hide', hide );

			editor.wp = editor.wp || {};
			editor.wp._createToolbar = create;
		}, true );
	});
} )( window.tinymce );
