var wpgmza_autoCompleteDisabled = false;

jQuery(function($) {
    var placeSearch, autocomplete;
    var wpgmza_table_length;
    var wpgmzaTable;
    var marker_added = false;
    var wpgmaps_markers_array = [];
    var infoWindow = new Array();
    var tmp_marker;
    var WPGM_Path_Polygon = new Array();
    var WPGM_Path = new Array();
    var saveReminderBound = false;

	function initShiftClick()
	{
		var lastSelectedRow;
		
		$(document.body).on("click", "[data-wpgmza-admin-marker-datatable] input[name='mark']", function(event) {
			
			var checkbox = event.currentTarget;
			var row = $(checkbox).closest("tr");
			
			if(lastSelectedRow && event.shiftKey)
			{
				var prevIndex = lastSelectedRow.index();
				var currIndex = row.index();
				var startIndex = Math.min(prevIndex, currIndex);
				var endIndex = Math.max(prevIndex, currIndex);
				var rows = $("[data-wpgmza-admin-marker-datatable] tbody>tr");
				
				// Clear
				$("[data-wpgmza-admin-marker-datatable] input[name='mark']").prop("checked", false);
				
				for(var i = startIndex; i <= endIndex; i++)
					$(rows[i]).find("input[name='mark']").prop("checked", true);
				
				
			}
			
			lastSelectedRow = row;
			
		});
	}
	initShiftClick();

	if ('undefined' == typeof window.jQuery) {
		alert("jQuery is not installed. WP Google Maps requires jQuery in order to function properly. Please ensure you have jQuery installed.")
	} else {
		// all good.. continue...
	}

	function wpgmza_parse_theme_data(raw)
	{
		var json;
		
		try{
			json = JSON.parse(raw);
		}catch(e) {
			try{
				json = eval(raw);
			}catch(e) {
				console.warn("Couldn't parse theme data");
				return [];
			}
		}
		
		return json;
	}
	
    function fillInAddress() {
      // Get the place details from the autocomplete object.
      //var place = autocomplete.getPlace();
    }

	function enableAddMarkerButton(enable) {
		var button = $("#wpgmza_addmarker");
		button.prop("disabled", (enable ? false : "disabled"));
		button.val(enable ? button.data("original-text") : "Saving...");
	}
	$("#wpgmza_addmarker").data("original-text", $("#wpgmza_addmarker").val());
	$("#wpgmza_addmarker_loading").hide();
	
	function enableEditMarkerButton(enable) {
		var button = $("#wpgmza_editmarker");
		button.prop("disabled", (enable ? false : "disabled"));
		button.val(enable ? button.data("original-text") : "Saving...");
		
		if(enable)
		{
			button.parent().show();
			$("#wpgmza_editmarker_loading").hide();
		}
		else
		{
			button.parent().hide();
			$("#wpgmza_editmarker_loading").show();
		}
	}
	$("#wpgmza_editmarker").data("original-text", $("#wpgmza_editmarker").val());
	$("#wpgmza_editmarker_loading").hide();
	
	function setMarkerAdded(added)
	{
		var button = $("#wpgmza_addmarker");
		var caption = (added ? "Save Marker" : "Add Marker");
		button.data("original-text", caption);
		button.val(caption);
		marker_added = added;
	}

	function onBeforeUnload(event)
	{
		var message = "You have unsaved changes to your map, leaving this page will discard them";
		event.returnValue = message;
		return message;
	}
	
	function bindSaveReminder()
	{
		if(saveReminderBound)
			return;
		
		window.addEventListener("beforeunload", onBeforeUnload);
	}
	
	function unbindSaveReminder()
	{
		window.removeEventListener("beforeunload", onBeforeUnload);
	}
	
	window.wpgmzaUnbindSaveReminder = function()
	{
		unbindSaveReminder();
	}
	
    jQuery(document).ready(function(){
		$("input[type='submit'].button-primary").on("click", function() {
			unbindSaveReminder();
		});

		jQuery('body').on('click', '#wpgmza-theme-editor__toggle', function(){
			jQuery('body').find('#wpgmza-map-theme-editor__holder').removeClass('active');
		});
		
		jQuery('body').on('click', '.wpgmza-border-box__option', function(){
			jQuery('.wpgmza-border-box__option').addClass('selected');
			jQuery('.wpgmza-border-box__option').not(this).removeClass('selected');
		});

		jQuery('body').on('click','.wpgmza_ac_result', function(e) {
			var index = jQuery(this).data('id');
			var lat = jQuery(this).data('lat');
			var lng = jQuery(this).data('lng');
			var name = jQuery('#wpgmza_item_address_'+index).html();
			
			
			jQuery("input[name='lat']").val(lat);
			jQuery("input[name='lng']").val(lng);
			jQuery("#wpgmza_add_address").val(name);
			jQuery('#wpgmza_autocomplete_search_results').hide();
			
			

		})

		jQuery('body').on('focusout', '#wpgmza_add_address', function(e) {
			setTimeout(function() {
				jQuery('#wpgmza_autocomplete_search_results').fadeOut('slow');
			},500)
			
		});

		var ajaxRequest = false;
		var wpgmzaAjaxTimeout = false;

		var wpgmzaStartTyping = false;
		var wpgmzaKeyStrokeCount = 1;
		var wpgmzaAvgTimeBetweenStrokes = 300; //300 ms by default (equates to 40wpm which is the average typing speed of a person)
		var wpgmzaTotalTimeForKeyStrokes = 0;
		var wpgmzaTmp = '';
		var wpgmzaIdentifiedTypingSpeed = false;


		jQuery('body').on('keyup', '#wpgmza_add_address', function(e) {
			if (wpgmza_autoCompleteDisabled) { return; }

			// if user is using their own API key then use the normal Google AutoComplete
			var wpgmza_apikey = false;
			if (WPGMZA_localized_data.settings.googleMapsApiKey && WPGMZA_localized_data.settings.googleMapsApiKey !== '') {
				wpgmza_apikey = WPGMZA_localized_data.settings.googleMapsApiKey;
				return;
			} else {
			
				if(e.key === "Escape" || e.key === "Alt" || e.key === "Control" || e.key === "Option" || e.key === "Shift" || e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
			        $('#wpgmza_autocomplete_search_results').hide();
			        return;
			    }

			    if (!wpgmzaIdentifiedTypingSpeed) {
					//determine duration between key strokes to determine when we should send the request to the autocomplete server
					//doing this avoids sending API calls for slow typers.
					var d = new Date();
					

					// set a timer to reset the delay counter
					clearTimeout(wpgmzaTmp);
					wpgmzaTmp = setTimeout(function(){ 
							wpgmzaStartTyping = false;
							wpgmzaAvgTimeBetweenStrokes = 300;
							wpgmzaTotalTimeForKeyStrokes = 0;
						},1500
					); // I'm pretty sure no one types one key stroke per 1.5 seconds. This should be safe.
					if (!wpgmzaStartTyping) {
						// first character press, set start time.
						
						wpgmzaStartTyping = d.getTime();
						wpgmzaKeyStrokeCount++;
					} else {
						if (wpgmzaKeyStrokeCount == 1) {
							// do nothing because its the first key stroke
						} else {


							wpgmzaCurrentTimeBetweenStrokes = d.getTime() - wpgmzaStartTyping;
							wpgmzaTotalTimeForKeyStrokes = wpgmzaTotalTimeForKeyStrokes + wpgmzaCurrentTimeBetweenStrokes;

							wpgmzaAvgTimeBetweenStrokes = (wpgmzaTotalTimeForKeyStrokes / (wpgmzaKeyStrokeCount-1)); // we cannot count the first key as that was the starting point
							wpgmzaStartTyping = d.getTime();

							if (wpgmzaKeyStrokeCount >= 3) {
								// we only need 3 keys to know how fast they type
								wpgmzaIdentifiedTypingSpeed = (wpgmzaAvgTimeBetweenStrokes);
								

							}
						}
						wpgmzaKeyStrokeCount++;
						


					}
					return;
				}

			    
			    // clear the previous timer
			    clearTimeout(wpgmzaAjaxTimeout);

			    $('#wpgmza_autocomplete_search_results').html('Searching... Stop typing to see results');
			    $('#wpgmza_autocomplete_search_results').show();

				


				var currentSearch = jQuery(this).val();
				if (currentSearch !== '') {

					if(ajaxRequest !== false){
		                ajaxRequest.abort();
		            }
		            var wpgmza_api_url = '';
		            if (!wpgmza_apikey) {
		            	wpgmza_api_url = "https://wpgmaps.us-3.evennode.com/api/v1/autocomplete?s="+currentSearch+"&d="+window.location.hostname+"&hash="+WPGMZA_localized_data.siteHash
		            } else {
		            	wpgmza_api_url = "https://wpgmaps.us-3.evennode.com/api/v1/autocomplete?s="+currentSearch+"&d="+window.location.hostname+"&hash="+WPGMZA_localized_data.siteHash+"&k="+wpgmza_apikey
		            }

		            // set a timer of 0.7 seconds to only continue with this if it runs out
		            wpgmzaAjaxTimeout = setTimeout(function() {
		            	ajaxRequest = jQuery.ajax({
					        url: wpgmza_api_url,
					        type: 'GET',
					        dataType: 'json', // added data type
					        success: function(results) {

		                        try { 

		                        	if (typeof results.error !== 'undefined') {
		                        		if (results.error == 'error1') {
		                        			$('#wpgmza_autoc_disabled').html(WPGMZA.localized_strings.cloud_api_key_error_1);
		                        			$('#wpgmza_autoc_disabled').fadeIn('slow');
		                        			$('#wpgmza_autocomplete_search_results').hide();
		                        			wpgmza_autoCompleteDisabled = true;
		                        		} else {
		                        			console.error(results.error);
		                        		}
		                        		
		                        	} else { 
							            $('#wpgmza_autocomplete_search_results').html('');
				                        var html = "";
				                        for(var i in results){ html += "<div class='wpgmza_ac_result " + (html === "" ? "" : "border-top") + "' data-id='" + i + "' data-lat='"+results[i]['lat']+"' data-lng='"+results[i]['lng']+"'><div class='wpgmza_ac_container'><div class='wpgmza_ac_icon'><img src='"+results[i]['icon']+"' /></div><div class='wpgmza_ac_item'><span id='wpgmza_item_name_"+i+"' class='wpgmza_item_name'>" + results[i]['place_name'] + "</span><span id='wpgmza_item_address_"+i+"' class='wpgmza_item_address'>" + results[i]['formatted_address'] + "</span></div></div></div>"; }
				                        if(html == ""){ html = "<div class='p-2 text-center'><small>No results found...</small></div>"; } 
				                        $('#wpgmza_autocomplete_search_results').html(html);
				                        $('#wpgmza_autocomplete_search_results').show();
				                        
				                    }
			                    } catch (exception) {
			                    	console.error("WP Google Maps Plugin: There was an error returning the list of places for your search");
			                    }


					            
					        }
					    });
		            },(wpgmzaIdentifiedTypingSpeed*2))
	                

					
					
				} else {
					$('#wpgmza_autocomplete_search_results').hide();
				}
			}
		});
		
        jQuery("select[name=wpgmza_table_length]").change(function () {
            wpgmza_table_length = jQuery(this).val();
        })

		if (/*WPGMZA.isGoogleAutocompleteSupported()*/ window.google && google.maps && google.maps.places && google.maps.places.Autocomplete && WPGMZA.settings.engine == "google-maps")
		{
			if(document.getElementById('wpgmza_add_address'))
			{
				/* initialize the autocomplete form */
				


				if (WPGMZA_localized_data.settings.googleMapsApiKey && WPGMZA_localized_data.settings.googleMapsApiKey !== '') {
						
						
			 		autocomplete = new google.maps.places.Autocomplete(
						document.getElementById('wpgmza_add_address'),
						{
							fields: ["name", "formatted_address"],
							types: ['geocode']
						}
					);
					
					// When the user selects an address from the dropdown,
					// populate the address fields in the form.
					


					google.maps.event.addListener(autocomplete, 'place_changed', function() {
						fillInAddress();
					});
				}
			}
			
			if(document.getElementById('wpgmza_store_locator_default_address'))
			{
				var store_default_autocomplete = new google.maps.places.Autocomplete(
                    document.getElementById('wpgmza_store_locator_default_address'),
                    {
						fields: ["name", "formatted_address"],
						types: ['geocode']
					}
				);
			}
		}
        
        /*wpgmzaTable = jQuery('#wpgmza_table').DataTable({
            "bProcessing": true,
            "aaSorting": [[ 0, "desc" ]]
        });*/
		
		/**
		 * Previously this would re-initialize the control. This shim
		 * simply now triggers an AJAX update
		 */
        function wpgmza_reinitialisetbl() {
			
			var elem = $("#wpgmza_marker_holder>[data-wpgmza-table]")[0];
			elem.wpgmzaDataTable.reload();
			
        }
		
        function wpgmza_InitMap() {
            var myLatLng;

			try {
				myLatLng = new WPGMZA.LatLng(wpgmaps_localize[wpgmaps_mapid].map_start_lat ,wpgmaps_localize[wpgmaps_mapid].map_start_lng);
			}catch(e) {
				myLatLng = new WPGMZA.LatLng();
			}
			
			$("#wpgmza_map").attr("data-map-id", "1");
			$("#wpgmza_map").attr("data-maps-engine", WPGMZA.settings.engine);
			
            MYMAP.init('#wpgmza_map', myLatLng, parseInt(wpgmaps_localize[wpgmaps_mapid].map_start_zoom));
            UniqueCode=Math.round(Math.random()*10000);
            MYMAP.placeMarkers(wpgmaps_markerurl + '?u='+UniqueCode,wpgmaps_mapid,null,myLatLng);
        }

        jQuery("#wpgmza_map").css({
            height:wpgmaps_localize[wpgmaps_mapid].map_height+''+wpgmaps_localize[wpgmaps_mapid].map_height_type,
            width:wpgmaps_localize[wpgmaps_mapid].map_width+''+wpgmaps_localize[wpgmaps_mapid].map_width_type

        });
		
		var geocoder = WPGMZA.Geocoder.createInstance();

		wpgmza_InitMap();

        jQuery("body").on("click", ".wpgmza_del_btn", function() {
			
			var $ = jQuery;
            var marker_id = $(this).attr("data-delete-marker-id");
			
			WPGMZA.mapEditPage.map.removeMarkerByID(marker_id);
			
        });
        jQuery("body").on("click", ".wpgmza_poly_del_btn", function() {
            var cur_id = jQuery(this).attr("id");
            var data = {
                    action: 'delete_poly',
                    security: wpgmaps_nonce,
                    map_id: wpgmaps_mapid,
                    poly_id: cur_id
            };
            jQuery.post(ajaxurl, data, function(response) {
                    WPGM_Path_Polygon[cur_id].setMap(null);
                    delete wpgmaps_localize_polygon_settings[cur_id];
                    jQuery("#wpgmza_poly_holder").html(response);

            });

        });
        jQuery("body").on("click", ".wpgmza_polyline_del_btn", function() {
            var cur_id = jQuery(this).attr("id");
            var data = {
                    action: 'delete_polyline',
                    security: wpgmaps_nonce,
                    map_id: wpgmaps_mapid,
                    poly_id: cur_id
            };
            jQuery.post(ajaxurl, data, function(response) {
                    WPGM_Path[cur_id].setMap(null);
                    delete wpgmaps_localize_polyline_settings[cur_id];
                    jQuery("#wpgmza_polyline_holder").html(response);
                    

            });

        });

		jQuery("body").on("click", ".wpgmza_circle_del_btn", function() {
			
			var circle_id = jQuery(this).attr("id");
			var map_id = jQuery("#wpgmza_id").val();
			
			var wpgm_map_id = "0";
			if (document.getElementsByName("wpgmza_id").length > 0) { wpgm_map_id = jQuery("#wpgmza_id").val(); }
			var data = {
					action: 'delete_circle',
					security: wpgmaps_nonce,
					map_id: wpgm_map_id,
					circle_id: circle_id
			};
			jQuery.post(ajaxurl, data, function(response) {
				$("#tabs-circles table").replaceWith(response);
				circle_array.forEach(function(circle) {
					
					if(circle.id == circle_id)
					{
						circle.setMap(null);
						return false;
					}
					
				});
				
			});
			
		});
		
		jQuery("body").on("click", ".wpgmza_rectangle_del_btn", function() {
			
			var rectangle_id = jQuery(this).attr("id");
			var map_id = jQuery("#wpgmza_id").val();
			
			var wpgm_map_id = "0";
			if (document.getElementsByName("wpgmza_id").length > 0) { wpgm_map_id = jQuery("#wpgmza_id").val(); }
			var data = {
					action: 'delete_rectangle',
					security: wpgmaps_nonce,
					map_id: wpgm_map_id,
					rectangle_id: rectangle_id
			};
			jQuery.post(ajaxurl, data, function(response) {
				$("#tabs-rectangles table").replaceWith(response);
				rectangle_array.forEach(function(rectangle) {
					
					if(rectangle.id == rectangle_id)
					{
						rectangle.setMap(null);
						return false;
					}
					
				});
				
			});
			
		});
		
        jQuery('#wpgmza_map_type').on('change', function (e) {
			
			if(WPGMZA.settings.engine && WPGMZA.settings.engine != "google-maps")
				return;
			
            var optionSelected = jQuery("option:selected", this);
            var valueSelected = this.value;
			
            if (typeof valueSelected !== "undefined") {
                if (valueSelected === "1") { maptype = google.maps.MapTypeId.ROADMAP; }
                else if (valueSelected === "2") { maptype = google.maps.MapTypeId.SATELLITE; }
                else if (valueSelected === "3") { maptype = google.maps.MapTypeId.HYBRID; }
                else if (valueSelected === "4") { maptype = google.maps.MapTypeId.TERRAIN; }
                else { maptype = google.maps.MapTypeId.ROADMAP; }
            } else {
                maptype = google.maps.MapTypeId.ROADMAP;
            }
			
            MYMAP.map.setOptions({mapTypeId: maptype});
        });


        var wpgmza_edit_address = ""; /* set this here so we can use it in the edit marker function below */
        var wpgmza_edit_lat = ""; 
        var wpgmza_edit_lng = ""; 
        jQuery("body").on("click", ".wpgmza_edit_btn", function() {
			
            var cur_id = jQuery(this).attr("data-edit-marker-id");
			
			WPGMZA.restAPI.call("/markers/" + cur_id, {
				success: function(result, textStatus, xhr) {
					
				
					jQuery("#wpgmza_edit_id").val(cur_id);
					
					jQuery("#wpgmza_add_address").val( result.address );
					jQuery("#wpgmza_animation").val( result.anim );
					jQuery("#wpgmza_infoopen").val( result.infoopen );
					jQuery("#wpgmza_addmarker_div").hide();
					jQuery("#wpgmza_editmarker_div").show();
					
				}
			});
			
        });

        jQuery("#wpgmza_addmarker").click(function(){
			var addressInput = $("#wpgmza_add_address")
			
			if(!marker_added && addressInput.val().length == 0) {
				alert("Please enter an address or right click on the map");
				addressInput.focus();
				return;
			}
			
			enableAddMarkerButton(false);


			// New cloud functions
			var cloud_lat = false;
			var cloud_lng = false;

			// is the lat and lng set from the WPGM Cloud Search?
			if (document.getElementsByName("lat").length > 0) { cloud_lat = document.getElementsByName("lat")[0].value; }
			if (document.getElementsByName("lng").length > 0) { cloud_lng = document.getElementsByName("lng")[0].value; }

			if (cloud_lat && cloud_lng) {
				var wpgm_infoopen = "0";
	            if (document.getElementsByName("wpgmza_animation").length > 0) { wpgm_anim = jQuery("#wpgmza_animation").val(); }
	            if (document.getElementsByName("wpgmza_infoopen").length > 0) { wpgm_infoopen = jQuery("#wpgmza_infoopen").val(); }

	            jQuery("input[name='lat']").val('');
				jQuery("input[name='lng']").val('');

				var data = {
                    action: 'add_marker',
                    security: wpgmaps_nonce,
                    map_id: wpgmaps_mapid,
                    address: addressInput.val(),
                    lat: parseFloat(cloud_lat),
                    lng: parseFloat(cloud_lng),
                    infoopen: wpgm_infoopen,
                    anim: wpgm_anim 
                };
                jQuery.post(ajaxurl, data, function(response) {

                    if (typeof tmp_marker !== "undefined" && typeof tmp_marker.map !== "undefined") {
                        tmp_marker.setMap(null);
                    }
                    returned_data = JSON.parse(response);

                    marker_id = returned_data.marker_id;
                    marker_data = returned_data.marker_data[marker_id];

                    if (typeof wpgmaps_localize_marker_data !== "undefined") { wpgmaps_localize_marker_data[marker_id] = marker_data; }
                    marker_data.map = MYMAP.map;

                    marker_data.point = new WPGMZA.LatLng(cloud_lat,cloud_lng);

                    add_marker(marker_data);

                    enableAddMarkerButton(true);
                    jQuery("#wpgmza_add_address").val("");
                    jQuery("#wpgmza_animation").val("0");
                    jQuery("#wpgmza_infoopen").val("0");
                    wpgmza_reinitialisetbl();
                    
                    MYMAP.map.setCenter(marker_data.point);
                    setMarkerAdded(false);
                    
                    if( jQuery("#wpgmaps_marker_cache_reminder").length > 0 ){

                        jQuery("#wpgmaps_marker_cache_reminder").fadeIn();

                    }

                    
                });

			} else {


	            var wpgm_address = "0";
	            var wpgm_gps = "0";
	            if ($("#wpgmza_add_address").length > 0)
					wpgm_address = $("#wpgmza_add_address").val();
	            var wpgm_anim = "0";
	            var wpgm_infoopen = "0";
	            if (document.getElementsByName("wpgmza_animation").length > 0) { wpgm_anim = jQuery("#wpgmza_animation").val(); }
	            if (document.getElementsByName("wpgmza_infoopen").length > 0) { wpgm_infoopen = jQuery("#wpgmza_infoopen").val(); }

	            /* first check if user has added a GPS co-ordinate */
	            checker = wpgm_address.split(",");
	            var wpgm_lat = "";
	            var wpgm_lng = "";
	            wpgm_lat = checker[0];
	            wpgm_lng = checker[1];
	            checker1 = parseFloat(checker[0]);
	            checker2 = parseFloat(checker[1]);
	            if (typeof wpgm_lat !== "undefined" && typeof wpgm_lng !== "undefined" && (wpgm_lat.match(/[a-zA-Z]/g) === null && wpgm_lng.match(/[a-zA-Z]/g) === null) && checker.length === 2 && (checker1 != NaN && (checker1 <= 90 || checker1 >= -90)) && (checker2 != NaN && (checker2 <= 90 || checker2 >= -90))) {
	                var data = {
	                    action: 'add_marker',
	                    security: wpgmaps_nonce,
	                    map_id: wpgmaps_mapid,
	                    address: wpgm_address,
	                    lat: wpgm_lat,
	                    lng: wpgm_lng,
	                    infoopen: wpgm_infoopen,
	                    anim: wpgm_anim 
	                };
	                jQuery.post(ajaxurl, data, function(response) {

	                    if (typeof tmp_marker !== "undefined" && typeof tmp_marker.map !== "undefined") {
	                        tmp_marker.setMap(null);
	                    }
	                    returned_data = JSON.parse(response);

	                    marker_id = returned_data.marker_id;
	                    marker_data = returned_data.marker_data[marker_id];

	                    if (typeof wpgmaps_localize_marker_data !== "undefined") { wpgmaps_localize_marker_data[marker_id] = marker_data; }
	                    marker_data.map = MYMAP.map;

	                    marker_data.point = new WPGMZA.LatLng(wpgm_lat,wpgm_lng);

	                    add_marker(marker_data);

	                    enableAddMarkerButton(true);
	                    jQuery("#wpgmza_add_address").val("");
	                    jQuery("#wpgmza_animation").val("0");
	                    jQuery("#wpgmza_infoopen").val("0");
	                    wpgmza_reinitialisetbl();
	                    
	                    MYMAP.map.setCenter(marker_data.point);
	                    setMarkerAdded(false);
	                    
	                    if( jQuery("#wpgmaps_marker_cache_reminder").length > 0 ){

	                        jQuery("#wpgmaps_marker_cache_reminder").fadeIn();

	                    }

	                    
	                });
	            } else { 
	                geocoder.geocode ({ 'address': wpgm_address }, function(results, status) {
	                    if (status == WPGMZA.Geocoder.SUCCESS) {

							result = results[0];
							wpgm_lat = result.latLng.lat;
							wpgm_lng = result.latLng.lng;

	                        var data = {
	                            action: 'add_marker',
	                            security: wpgmaps_nonce,
	                            map_id: wpgmaps_mapid,
	                            address: wpgm_address,
	                            lat: wpgm_lat,
	                            lng: wpgm_lng,
	                            infoopen: wpgm_infoopen,
	                            anim: wpgm_anim 
	                        };
	                        jQuery.post(ajaxurl, data, function(response) {
	                            returned_data = JSON.parse(response);

	                            marker_id = returned_data.marker_id;
	                            marker_data = returned_data.marker_data[marker_id];
	                            if (typeof wpgmaps_localize_marker_data !== "undefined") { wpgmaps_localize_marker_data[marker_id] = marker_data; }
	                            marker_data.map = MYMAP.map;

	                            marker_data.point = new WPGMZA.LatLng(wpgm_lat,wpgm_lng);
	                            add_marker(marker_data);

	                            enableAddMarkerButton(true);
	                            jQuery("#wpgmza_add_address").val("");
	                            jQuery("#wpgmza_animation").val("0");
	                            jQuery("#wpgmza_infoopen").val("0");
	                            wpgmza_reinitialisetbl();
	                            var myLatLng = new WPGMZA.LatLng(wpgm_lat,wpgm_lng);
	                            MYMAP.map.setCenter(myLatLng);
	                            setMarkerAdded(false);

	                            if( jQuery("#wpgmaps_marker_cache_reminder").length > 0 ){

	                                jQuery("#wpgmaps_marker_cache_reminder").fadeIn();
	                                
	                            }
	                        });
	                        

	                    } else {
							var message = status;
							
							if(status == WPGMZA.Geocoder.ZERO_RESULTS)
								message = WPGMZA.localized_strings.zero_results;
							
							if(status == WPGMZA.Geocoder.FAIL && 
								$(".wpgmza-geocode-api-notice").length == 0 &&
								WPGMZA.settings.engine != "open-layers")
							{
								var notice = $("<div class='wpgmza-geocode-api-notice notice notice-error'><p>" + WPGMZA.localized_strings.geocoding_library_notice + "</p></div>");
								
								$("#wpgmza_add_address").parent().append(notice);
							}
							
	                        enableAddMarkerButton(true);

	                    }
	                });
	            }
	        }
        });


        jQuery("#wpgmza_editmarker").click(function(){

            jQuery("#wpgmza_editmarker_div").hide();
            jQuery("#wpgmza_editmarker_loading").show();


            var wpgm_edit_id;
            wpgm_edit_id = parseInt(jQuery("#wpgmza_edit_id").val());
			
			
			var oldMarker = WPGMZA.mapEditPage.map.getMarkerByID(wpgm_edit_id);
			if(oldMarker) {
				WPGMZA.mapEditPage.map.removeMarker(oldMarker);
			}
			
            var wpgm_address = "0";
            var wpgm_gps = "0";
            var wpgm_anim = "0";
            var wpgm_infoopen = "0";
            if (document.getElementsByName("wpgmza_add_address").length > 0) { wpgm_address = jQuery("#wpgmza_add_address").val(); }
            
            var do_geocode;
            if (wpgm_address === wpgmza_edit_address) {
                do_geocode = false;
                var wpgm_lat = wpgmza_edit_lat;
                var wpgm_lng = wpgmza_edit_lng;
            } else { 
                do_geocode = true;
            }
            
            if (document.getElementsByName("wpgmza_animation").length > 0) { wpgm_anim = jQuery("#wpgmza_animation").val(); }
            if (document.getElementsByName("wpgmza_infoopen").length > 0) { wpgm_infoopen = jQuery("#wpgmza_infoopen").val(); }

            if (do_geocode === true) {

            geocoder.geocode( { 'address': wpgm_address}, function(results, status) {
                if (status == WPGMZA.Geocoder.SUCCESS) {
                	if (!results[0].geometry && results[0].latLng) {
                		var wpgm_lat = parseFloat(results[0].latLng._lat);
	                    var wpgm_lng = parseFloat(results[0].latLng._lat);
                	} else {
	                    wpgm_gps = String(results[0].geometry.location);
	                    var wpgm_lat = parseFloat(results[0].geometry.location.lat);
	                    var wpgm_lng = parseFloat(results[0].geometry.location.lng);
	                }

                    var data = {
                        action: 'edit_marker',
                        security: wpgmaps_nonce,
                        map_id: wpgmaps_mapid,
                        edit_id: wpgm_edit_id,
                        address: wpgm_address,
                        lat: wpgm_lat,
                        lng: wpgm_lng,
                        anim: wpgm_anim,
                        infoopen: wpgm_infoopen
                    };

                    jQuery.post(ajaxurl, data, function(response) {
                        returned_data = JSON.parse(response);
                        marker_id = returned_data.marker_id;
                        marker_data = returned_data.marker_data[marker_id];
                        if (typeof wpgmaps_localize_marker_data !== "undefined") {  wpgmaps_localize_marker_data[marker_id] = marker_data; }
                        marker_data.map = MYMAP.map;

                        marker_data.point = new WPGMZA.LatLng(wpgm_lat,wpgm_lng);

                        add_marker(marker_data);
                        
                        jQuery("#wpgmza_add_address").val("");
                        jQuery("#wpgmza_add_title").val("");
                        //jQuery("#wpgmza_marker_holder").html(JSON.parse(response).table_html);
                        jQuery("#wpgmza_addmarker_div").show();
                        jQuery("#wpgmza_editmarker_loading").hide();
                        jQuery("#wpgmza_edit_id").val("");
                        wpgmza_reinitialisetbl();
                        setMarkerAdded(false);

                        if( jQuery("#wpgmaps_marker_cache_reminder").length > 0 ){

                            jQuery("#wpgmaps_marker_cache_reminder").fadeIn();

                        }
                    });

                } else {
					var message = status;
					
					if(status == WPGMZA.Geocoder.ZERO_RESULTS)
						message = WPGMZA.localized_strings.zero_results;
					
                    alert("Geocode was not successful for the following reason: " + message);
					enableEditMarkerButton(true);
                }
            });
            } else {
                /* address was the same, no need for geocoding */
                var data = {
                        action: 'edit_marker',
                        security: wpgmaps_nonce,
                        map_id: wpgmaps_mapid,
                        edit_id: wpgm_edit_id,
                        address: wpgm_address,
                        lat: wpgm_lat,
                        lng: wpgm_lng,
                        anim: wpgm_anim,
                        infoopen: wpgm_infoopen
                    };

                    jQuery.post(ajaxurl, data, function(response) {
                        returned_data = JSON.parse(response);
                        marker_id = returned_data.marker_id;
                        marker_data = returned_data.marker_data[marker_id];
                        
                        if (typeof wpgmaps_localize_marker_data !== "undefined") { wpgmaps_localize_marker_data[marker_id] = marker_data; }
                        marker_data.map = MYMAP.map;

                        marker_data.point = new WPGMZA.LatLng(wpgm_lat,wpgm_lng);

                        add_marker(marker_data);
                        
                        jQuery("#wpgmza_add_address").val("");
                        jQuery("#wpgmza_add_title").val("");
                        //jQuery("#wpgmza_marker_holder").html(JSON.parse(response).table_html);
                        jQuery("#wpgmza_addmarker_div").show();
                        jQuery("#wpgmza_editmarker_loading").hide();
                        jQuery("#wpgmza_edit_id").val("");
                        wpgmza_reinitialisetbl();
                        setMarkerAdded(false);
                        if( jQuery("#wpgmaps_marker_cache_reminder").length > 0 ){

                            jQuery("#wpgmaps_marker_cache_reminder").fadeIn();

                        }
                    });
            }



        });
    });

MYMAP = {
    map: null,
    bounds: null
}

if (wpgmaps_localize_global_settings['wpgmza_settings_map_draggable'] === "" || 'undefined' === typeof wpgmaps_localize_global_settings['wpgmza_settings_map_draggable']) { wpgmza_settings_map_draggable = true; } else { wpgmza_settings_map_draggable = false;  }
if (wpgmaps_localize_global_settings['wpgmza_settings_map_clickzoom'] === "" || 'undefined' === typeof wpgmaps_localize_global_settings['wpgmza_settings_map_clickzoom']) { wpgmza_settings_map_clickzoom = false; } else { wpgmza_settings_map_clickzoom = true; }
if (wpgmaps_localize_global_settings['wpgmza_settings_map_scroll'] === "" || 'undefined' === typeof wpgmaps_localize_global_settings['wpgmza_settings_map_scroll']) { wpgmza_settings_map_scroll = true; } else { wpgmza_settings_map_scroll = false; }
if (wpgmaps_localize_global_settings['wpgmza_settings_map_zoom'] === "" || 'undefined' === typeof wpgmaps_localize_global_settings['wpgmza_settings_map_zoom']) { wpgmza_settings_map_zoom = true; } else { wpgmza_settings_map_zoom = false; }
if (wpgmaps_localize_global_settings['wpgmza_settings_map_pan'] === "" || 'undefined' === typeof wpgmaps_localize_global_settings['wpgmza_settings_map_pan']) { wpgmza_settings_map_pan = true; } else { wpgmza_settings_map_pan = false; }
if (wpgmaps_localize_global_settings['wpgmza_settings_map_type'] === "" || 'undefined' === typeof wpgmaps_localize_global_settings['wpgmza_settings_map_type']) { wpgmza_settings_map_type = true; } else { wpgmza_settings_map_type = false; }
if (wpgmaps_localize_global_settings['wpgmza_settings_map_streetview'] === "" || 'undefined' === typeof wpgmaps_localize_global_settings['wpgmza_settings_map_streetview']) { wpgmza_settings_map_streetview = true; } else { wpgmza_settings_map_streetview = false; }
if (wpgmaps_localize_global_settings['wpgmza_settings_map_full_screen_control'] === "" || 'undefined' === typeof wpgmaps_localize_global_settings['wpgmza_settings_map_full_screen_control']) { wpgmza_settings_map_full_screen_control = true; } else { wpgmza_settings_map_full_screen_control = false; }

if ('undefined' === typeof wpgmaps_localize[wpgmaps_mapid]['other_settings']['map_max_zoom'] || wpgmaps_localize[wpgmaps_mapid]['other_settings']['map_max_zoom'] === "") { wpgmza_max_zoom = 0; } else { wpgmza_max_zoom = parseInt(wpgmaps_localize[wpgmaps_mapid]['other_settings']['map_max_zoom']); }
if ('undefined' === typeof wpgmaps_localize[wpgmaps_mapid]['other_settings']['map_min_zoom'] || wpgmaps_localize[wpgmaps_mapid]['other_settings']['map_min_zoom'] === "") { wpgmza_min_zoom = 21; } else { wpgmza_min_zoom = parseInt(wpgmaps_localize[wpgmaps_mapid]['other_settings']['map_min_zoom']); }


MYMAP.init = function(selector, latLng, zoom) {

	var maptype = null;
    if (window.google)
		switch(parseInt(wpgmaps_localize[wpgmaps_mapid].type))
		{
			case 2:
				maptype = google.maps.MapTypeId.SATELLITE;
				break;
				
			case 3:
				maptype = google.maps.MapTypeId.HYBRID;
				break;
				
			case 4:
				maptype = google.maps.MapTypeId.TERRAIN;
				break;
				
			default:
				maptype = google.maps.MapTypeId.ROADMAP;
				break;
		}

    var myOptions = {
		id: 1,
        zoom:zoom,
        minZoom: wpgmza_max_zoom,
        maxZoom: wpgmza_min_zoom,
        center: latLng,
        zoomControl: wpgmza_settings_map_zoom,
        panControl: wpgmza_settings_map_pan,
        mapTypeControl: wpgmza_settings_map_type,
        streetViewControl: wpgmza_settings_map_streetview,
        draggable: wpgmza_settings_map_draggable,
        disableDoubleClickZoom: wpgmza_settings_map_clickzoom,
        scrollwheel: wpgmza_settings_map_scroll,
        fullscreenControl: wpgmza_settings_map_full_screen_control,
        mapTypeId: maptype
    }

	this.map = WPGMZA.Map.createInstance(jQuery(selector)[0], myOptions);
	
	this.map.setOptions({
		mapTypeId: maptype
	});

	jQuery(document.body).trigger('wpgmza_map_editor_init');
    //this.bounds = new google.maps.LatLngBounds();

    if ("undefined" !== typeof wpgmaps_localize[wpgmaps_mapid]['other_settings']['wpgmza_theme_data'] && wpgmaps_localize[wpgmaps_mapid]['other_settings']['wpgmza_theme_data'] !== false && wpgmaps_localize[wpgmaps_mapid]['other_settings']['wpgmza_theme_data'] !== "") {
        var wpgmza_theme_data = wpgmza_parse_theme_data(wpgmaps_localize[wpgmaps_mapid]['other_settings']['wpgmza_theme_data']);
        this.map.setOptions({styles: wpgmza_theme_data});
    }
	
	this.map.on("rightclick", function(event) {
        if (marker_added === false) {
            tmp_marker = WPGMZA.Marker.createInstance({
                position: event.latLng, 
                map: MYMAP.map
            });
            tmp_marker.setDraggable(true);
            //google.maps.event.addListener(tmp_marker, 'dragend', function(event) { 
			tmp_marker.on("dragend", function(event) {
                jQuery("#wpgmza_add_address").val(event.latLng.lat+', '+event.latLng.lng);
            } );
            jQuery("#wpgmza_add_address").val(event.latLng.lat+', '+event.latLng.lng);
            jQuery("#wpgm_notice_message_save_marker").show();
			
            setMarkerAdded("true");
			bindSaveReminder();
			
            setTimeout(function() {
                jQuery("#wpgm_notice_message_save_marker").fadeOut('slow')
            }, 3000);
        } else {
            jQuery("#wpgm_notice_message_addfirst_marker").fadeIn('fast')
            setTimeout(function() {
                jQuery("#wpgm_notice_message_addfirst_marker").fadeOut('slow')
            }, 3000);
        }
       
    });

    this.map.on('zoom_changed', function() {

        zoomLevel = MYMAP.map.getZoom();
	
        jQuery("#wpgmza_start_zoom").val(zoomLevel);
        
        if (zoomLevel == 0 && WPGMZA.settings.engine == "google-maps") {
            MYMAP.map.setZoom(10);
        }

    });
    
    jQuery( "#wpgmza_map").trigger( 'wpgooglemaps_loaded' );

    if (wpgmaps_localize_polygon_settings !== null) {
        if (typeof wpgmaps_localize_polygon_settings !== "undefined") {
              for(var poly_entry in wpgmaps_localize_polygon_settings) {
                add_polygon(poly_entry);
              }
        }
    }
    if (wpgmaps_localize_polyline_settings !== null) {
        if (typeof wpgmaps_localize_polyline_settings !== "undefined") {
              for(var poly_entry in wpgmaps_localize_polyline_settings) {
                add_polyline(poly_entry);
              }
        }
    }
    if (wpgmaps_localize[wpgmaps_mapid]['bicycle'] === "1") {
		MYMAP.map.enableBicycleLayer(true);
		
        //var bikeLayer = new google.maps.BicyclingLayer();
        //bikeLayer.setMap(MYMAP.map);
    }        
	
	if(WPGMZA.settings.engine == "google")
	{
		if (wpgmaps_localize[wpgmaps_mapid]['traffic'] === "1") {
			var trafficLayer = new google.maps.TrafficLayer();
			trafficLayer.setMap(MYMAP.map);
		}    

		if ("undefined" !== typeof wpgmaps_localize[wpgmaps_mapid]['other_settings']['transport_layer'] && wpgmaps_localize[wpgmaps_mapid]['other_settings']['transport_layer'] === 1) {
			var transitLayer = new google.maps.TransitLayer();
			transitLayer.setMap(MYMAP.map);
		}
	}	
    
	if(window.wpgmza_circle_data_array) {
		window.circle_array = [];
		for(var circle_id in wpgmza_circle_data_array)
			add_circle(1, wpgmza_circle_data_array[circle_id]);
	}
	
	if(window.wpgmza_rectangle_data_array) {
		window.rectangle_array = [];
		for(var rectangle_id in wpgmza_rectangle_data_array)
			add_rectangle(1, wpgmza_rectangle_data_array[rectangle_id]);
	}
	
	
    MYMAP.map.on('click', function(event) {
		if(event.target instanceof WPGMZA.Map)
			close_infowindows();
    });
    
    
	var firstBoundsChangedEvent = true;
	
    MYMAP.map.on('bounds_changed', function() {
        var location = MYMAP.map.getCenter();
        jQuery("#wpgmza_start_location").val(location.lat+","+location.lng);
        jQuery("#wpgmaps_save_reminder").show();
		
		if(!firstBoundsChangedEvent)
			bindSaveReminder();
		
		firstBoundsChangedEvent = false;
    });

}


if (typeof wpgmaps_localize_global_settings['wpgmza_settings_infowindow_width'] !== "undefined" && wpgmaps_localize_global_settings['wpgmza_settings_infowindow_width'] !== "" && typeof infoWindow !== "undefined" && typeof infoWindow.setOptions !== "undefined") { infoWindow.setOptions({maxWidth:wpgmaps_localize_global_settings['wpgmza_settings_infowindow_width']}); }

if(window.google)
	google.maps.event.addDomListener(window, 'resize', function() {
		var myLatLng = new WPGMZA.LatLng(wpgmaps_localize[wpgmaps_mapid].map_start_lat,wpgmaps_localize[wpgmaps_mapid].map_start_lng);
		MYMAP.map.setCenter(myLatLng);
	});


MYMAP.placeMarkers = function(filename,map_id,radius,searched_center,distance_type) {
    var check1 = 0;
    if (wpgmaps_localize_global_settings.wpgmza_settings_marker_pull === '1') {
        jQuery.get(filename, function(xml){
            jQuery(xml).find("marker").each(function(){
                var wpmgza_map_id = jQuery(this).find('map_id').text();

                if (wpmgza_map_id == map_id) {
                    var wpmgza_address = jQuery(this).find('address').text();
                    var lat = jQuery(this).find('lat').text();
                    var lng = jQuery(this).find('lng').text();
                    var wpmgza_anim = jQuery(this).find('anim').text();
                    var marker_id = jQuery(this).find('marker_id').text();
                    var wpmgza_infoopen = jQuery(this).find('infoopen').text();
                    var current_lat = jQuery(this).find('lat').text();
                    var current_lng = jQuery(this).find('lng').text();
                    var show_marker_radius = true;

                    if (radius !== null) {
                        if (check1 > 0 ) { } else { 


                            var point = new WPGMZA.LatLng(parseFloat(searched_center.lat()),parseFloat(searched_center.lng()));
                            //MYMAP.bounds.extend(point);
                            if (typeof wpgmaps_localize[wpgmaps_mapid]['other_settings']['store_locator_bounce'] === "undefined" || wpgmaps_localize[wpgmaps_mapid]['other_settings']['store_locator_bounce'] === 1) {
                                var marker = WPGMZA.Marker.createInstance({
                                        position: point,
                                        map: MYMAP.map,
                                        animation: google.maps.Animation.BOUNCE
                                });
                            } else { /* dont show icon */ }
                            if (distance_type == "1") {
                                var populationOptions = {
                                      strokeColor: '#FF0000',
                                      strokeOpacity: 0.25,
                                      strokeWeight: 2,
                                      fillColor: '#FF0000',
                                      fillOpacity: 0.15,
                                      map: MYMAP.map,
                                      center: point,
                                      radius: parseInt(radius / 0.000621371)
                                    };
                            } else {
                                var populationOptions = {
                                      strokeColor: '#FF0000',
                                      strokeOpacity: 0.25,
                                      strokeWeight: 2,
                                      fillColor: '#FF0000',
                                      fillOpacity: 0.15,
                                      map: MYMAP.map,
                                      center: point,
                                      radius: parseInt(radius / 0.001)
                                    };
                            }
                            
                            cityCircle = new google.maps.Circle(populationOptions);
                            check1 = check1 + 1;
                        }
                        var R = 0;
                        if (distance_type == "1") {
                            R = 3958.7558657440545; 
                        } else {
                            R = 6378.16; 
                        }
                        var dLat = toRad(searched_center.lat()-current_lat);
                        var dLon = toRad(searched_center.lng()-current_lng); 
                        var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(current_lat)) * Math.cos(toRad(searched_center.lat())) * Math.sin(dLon/2) * Math.sin(dLon/2); 
                        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
                        var d = R * c;
                        
                        if (d < radius) { show_marker_radius = true; } else { show_marker_radius = false; }
                    }



                    var point = new WPGMZA.LatLng(parseFloat(lat),parseFloat(lng));
                    //MYMAP.bounds.extend(point);
                    if (show_marker_radius === true) {
                            marker_data = new Object();
                            marker_data.anim = wpmgza_anim;
                            marker_data.point = point;
                            marker_data.marker_id = marker_id;
                            marker_data.map = MYMAP.map;
                            marker_data.address = wpmgza_address;
                            marker_data.radius = radius;
                            marker_data.distance_type = distance_type;
                            marker_data.d = d;
                            marker_data.infoopen = wpmgza_infoopen;


                            add_marker(marker_data);

                    }
                }
            });

        });
    } else { 

        if (typeof wpgmaps_localize_marker_data !== "undefined") {
            jQuery.each(wpgmaps_localize_marker_data, function(i, val) {
                
                var wpmgza_map_id = val.map_id;

				if (wpmgza_map_id == map_id) {
					
					// NB: Legacy PHP translation workaround
					var data = $.extend({}, val);
					data.id = data.marker_id;
					delete data.marker_id;

					add_marker(data);
					
				}
				
            });
        }
    }
}


function add_marker(marker_data) {

	if(marker_data.marker_id)
		marker_data.id = marker_data.marker_id;

	var marker = wpgmaps_markers_array[marker_data.marker_id] = WPGMZA.Marker.createInstance(marker_data);
	WPGMZA.maps[0].addMarker(marker);

    var d_string = "";

    if (typeof marker_data.radius !== "undefined" && marker_data.radius !== null) {                                 
        if (marker_data.distance_type == "1") {
            d_string = "<p style='min-width:100px; display:block;'>"+Math.round(marker_data.d,2)+" "+wpgmaps_lang_m_away+"</p>"; 
        } else {
            d_string = "<p style='min-width:100px; display:block;'>"+Math.round(marker_data.d,2)+" "+wpgmaps_lang_km_away+"</p>";
        }
    } else { d_string = ''; }

    infoWindow[marker.id] = WPGMZA.InfoWindow.createInstance(marker);

    var html='<span style=\'min-width:100px; display:block;\'>'+marker_data.address+'</span>'+d_string;
    if (marker_data.infoopen === "1") {
        infoWindow[marker.id].setContent(html);
        infoWindow[marker.id].open(marker_data.map, wpgmaps_markers_array[marker_data.marker_id]);
    }

    temp_actiontype = 'click';
    if (typeof wpgmaps_localize_global_settings.wpgmza_settings_map_open_marker_by !== "undefined" && wpgmaps_localize_global_settings.wpgmza_settings_map_open_marker_by == '2') {
        temp_actiontype = 'mouseover';
    }
	
    marker.on(temp_actiontype, function() {
        close_infowindows();
        infoWindow[marker.id].setContent(html);
        infoWindow[marker.id].open(marker_data.map, marker);
    });

}
function close_infowindows() {
    infoWindow.forEach(function(entry,index) {
        infoWindow[index].close();
    });
}

function add_polygon(polygonid) {
	
	if(WPGMZA.settings.engine == "open-layers")
		return;
	
    var tmp_data = wpgmaps_localize_polygon_settings[polygonid];
     var current_poly_id = polygonid;
     var tmp_polydata = tmp_data['polydata'];
     var WPGM_PathData = new Array();
     for (tmp_entry2 in tmp_polydata) {
         if (typeof tmp_polydata[tmp_entry2][0] !== "undefined") {
            
            WPGM_PathData.push(new google.maps.LatLng(tmp_polydata[tmp_entry2][0], tmp_polydata[tmp_entry2][1]));
        }
     }
     if (tmp_data['lineopacity'] === null || tmp_data['lineopacity'] === "") {
         tmp_data['lineopacity'] = 1;
     }
     
     var bounds = new google.maps.LatLngBounds();
     for (i = 0; i < WPGM_PathData.length; i++) {
       bounds.extend(WPGM_PathData[i]);
     }

    WPGM_Path_Polygon[polygonid] = new google.maps.Polygon({
         path: WPGM_PathData,
         clickable: false, /* must add option for this */ 
         strokeColor: "#"+tmp_data['linecolor'],
         fillOpacity: tmp_data['opacity'],
         strokeOpacity: tmp_data['lineopacity'],
         fillColor: "#"+tmp_data['fillcolor'],
         strokeWeight: 2,
         map: MYMAP.map.googleMap
   });
   WPGM_Path_Polygon[polygonid].setMap(MYMAP.map.googleMap);

    polygon_center = bounds.getCenter();

    if (tmp_data['title'] !== "") {
        if(!window.infoWindow_poly) {
            infoWindow_poly = {};
        }
        infoWindow_poly[polygonid] = new google.maps.InfoWindow();
        google.maps.event.addListener(WPGM_Path_Polygon[polygonid], 'click', function(event) {
             infoWindow_poly[polygonid].setPosition(event.latLng);
             content = "";
             if (tmp_data['link'] !== "") {
                 var content = "<a href='"+tmp_data['link']+"'><h4 class='wpgmza_polygon_title'>"+tmp_data['title']+"</h4></a>";
                 if (tmp_data['description'] !== "") {
                 	content += '<p class="wpgmza_polygon_description">' + tmp_data['description'] + '</p>';
                 }
             } else {
                 var content = '<h4 class="wpgmza_polygon_title">' + tmp_data['title'] + '</h4>';
                 if (tmp_data['description'] !== "") {
                 	content += '<p class="wpgmza_polygon_description">' + tmp_data['description'] + '</p>';
                 }
             }
             infoWindow_poly[polygonid].setContent(content);
             infoWindow_poly[polygonid].open(MYMAP.map,this.position);
        }); 
    }


    
}
function add_polyline(polyline) {
    
	if(WPGMZA.settings.engine == "open-layers")
		return;
    
    var tmp_data = wpgmaps_localize_polyline_settings[polyline];

    var current_poly_id = polyline;
    var tmp_polydata = tmp_data['polydata'];
    var WPGM_Polyline_PathData = new Array();
    for (tmp_entry2 in tmp_polydata) {
        if (typeof tmp_polydata[tmp_entry2][0] !== "undefined" && typeof tmp_polydata[tmp_entry2][1] !== "undefined") {
            var lat = tmp_polydata[tmp_entry2][0].replace(')', '');
            lat = lat.replace('(','');
            var lng = tmp_polydata[tmp_entry2][1].replace(')', '');
            lng = lng.replace('(','');
            WPGM_Polyline_PathData.push(new google.maps.LatLng(lat, lng));
        }
         
         
    }
     if (tmp_data['lineopacity'] === null || tmp_data['lineopacity'] === "") {
         tmp_data['lineopacity'] = 1;
     }

    WPGM_Path[polyline] = new google.maps.Polyline({
         path: WPGM_Polyline_PathData,
         strokeColor: "#"+tmp_data['linecolor'],
         strokeOpacity: tmp_data['opacity'],
         strokeWeight: tmp_data['linethickness'],
         map: MYMAP.map.googleMap
   });
   WPGM_Path[polyline].setMap(MYMAP.map.googleMap);
    
    
}

function add_circle(mapid, data)
{
	if(WPGMZA.settings.engine != "google-maps")
		return;
	
	data.map = MYMAP.map.googleMap;
	
	var m = data.center.match(/-?\d+(\.\d*)?/g);
	data.center = {
		lat: parseFloat(m[0]),
		lng: parseFloat(m[1]),
	};
	
	data.radius = parseFloat(data.radius);
	data.fillColor = data.color;
	data.fillOpacity = parseFloat(data.opacity);
	
	data.strokeOpacity = 0;
	
	var circle = new google.maps.Circle(data);
	circle_array.push(circle);
}

function add_rectangle(mapid, data)
{
	if(WPGMZA.settings.engine != "google-maps")
		return;
	
	data.map = MYMAP.map.googleMap;
	
	data.fillColor = data.color;
	data.fillOpacity = parseFloat(data.opacity);
	
	var northWest = data.cornerA;
	var southEast = data.cornerB;
	
	var m = northWest.match(/-?\d+(\.\d+)?/g);
	var north = parseFloat(m[0]);
	var west = parseFloat(m[1]);
	
	m = southEast.match(/-?\d+(\.\d+)?/g);
	var south = parseFloat(m[0]);
	var east = parseFloat(m[1]);
	
	data.bounds = {
		north: north,
		west: west,
		south: south,
		east: east
	};
	
	data.strokeOpacity = 0;
	
	var rectangle = new google.maps.Rectangle(data);
	rectangle_array.push(rectangle);
}

function updateRoadmapThemeWarning()
{
	var mapTypeSelectValue = $("select[name='wpgmza_map_type']").val();
	var warningElements = $(".wpgmza-theme-and-roadmap-warning");
	
	if(mapTypeSelectValue == 1 || mapTypeSelectValue == 4)
	{
		// We'll hide the warning here
		warningElements.hide();
	}
	else
	{
		// We'll show the warning here
		warningElements.show();
	}
}

updateRoadmapThemeWarning();
$("select[name='wpgmza_map_type']").on("change", updateRoadmapThemeWarning);

});