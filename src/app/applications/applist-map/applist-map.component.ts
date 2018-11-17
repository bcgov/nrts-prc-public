import { Component, AfterViewInit, OnChanges, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { ApplicationRef, ElementRef, SimpleChanges, Injector, ComponentFactoryResolver } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import 'leaflet';
import 'leaflet.markercluster';
import * as _ from 'lodash';

import { Application } from 'app/models/application';
import { ApplicationService } from 'app/services/application.service';
import { ConfigService } from 'app/services/config.service';
import { AppDetailPopupComponent } from 'app/applications/app-detail-popup/app-detail-popup.component';

declare module 'leaflet' {
  export interface FeatureGroup<P = any> {
    dispositionId: number;
  }
  export interface Marker<P = any> {
    dispositionId: number;
  }
}

const L = window['L'];

const markerIconYellow = L.icon({
  iconUrl: 'assets/images/marker-icon-yellow.svg',
  // Retina Icon is not needed here considering we're using an SVG. Enable if you want to change to a raster asset.
  // iconRetinaUrl: 'assets/images/marker-icon-2x-yellow.svg',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  tooltipAnchor: [16, -28]
});

const markerIconYellowLg = L.icon({
  iconUrl: 'assets/images/marker-icon-yellow-lg.svg',
  // Retina Icon is not needed here considering we're using an SVG. Enable if you want to change to a raster asset.
  // iconRetinaUrl: 'assets/images/marker-icon-yellow-lg.svg',
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  // popupAnchor: [1, -34], // TODO: update, if needed
  // tooltipAnchor: [16, -28] // TODO: update, if needed
});

@Component({
  selector: 'app-applist-map',
  templateUrl: './applist-map.component.html',
  styleUrls: ['./applist-map.component.scss']
})

export class ApplistMapComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() applications: Array<Application> = []; // from applications component
  @Input() applist; // from applications component
  @Input() appfilters; // from applications component
  @Output() toggleCurrentApp = new EventEmitter(); // to applications component
  @Output() updateCoordinates = new EventEmitter(); // to applications component

  private map: L.Map = null;
  private markerList: Array<L.Marker> = []; // list of markers
  private currentMarker: L.Marker = null; // for removing previous marker
  private markerClusterGroup = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40, // NB: change to 0 to disable clustering
    // iconCreateFunction: this.clusterCreate // FUTURE: for custom markers, if needed
  });
  private loading = false;
  private gotChanges = false;
  private oldZoom: number = null;
  private ngUnsubscribe: Subject<boolean> = new Subject<boolean>();

  readonly defaultBounds = L.latLngBounds([48, -139], [60, -114]); // all of BC

  constructor(
    private appRef: ApplicationRef,
    private elementRef: ElementRef,
    public applicationService: ApplicationService,
    public configService: ConfigService,
    private injector: Injector,
    private resolver: ComponentFactoryResolver
  ) { }

  // // for creating custom cluster icon
  // private clusterCreate(cluster): L.Icon | L.DivIcon {
  //   const html = cluster.getChildcount().toString();
  //   return L.divIcon({ html: html, className: 'my-cluster', iconSize: L.point(40, 40) });
  // }

  // create map after view (which contains map id) is initialized
  ngAfterViewInit() {
    const self = this; // for closure function below

    // custom control to reset map view
    const resetViewControl = L.Control.extend({
      options: {
        position: 'bottomright'
      },
      onAdd: function () {
        const element = L.DomUtil.create('button');

        element.title = 'Reset view';
        element.innerText = 'refresh'; // material icon name
        element.onclick = () => self.fitBounds(); // use default bounds
        element.className = 'material-icons map-reset-control';

        // prevent underlying map actions for these events
        L.DomEvent.disableClickPropagation(element); // includes double-click
        L.DomEvent.disableScrollPropagation(element);

        return element;
      },
    });

    const Esri_OceanBasemap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri',
      maxZoom: 13,
      noWrap: true
    });
    const Esri_NatGeoWorldMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
      maxZoom: 16,
      noWrap: true
    });
    const OpenMapSurfer_Roads = L.tileLayer('https://korona.geog.uni-heidelberg.de/tiles/roads/x={x}&y={y}&z={z}', {
      attribution: 'Imagery from <a href="http://giscience.uni-hd.de/">GIScience Research Group @ University of Heidelberg</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 20,
      noWrap: true
    });
    const World_Topo_Map = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
      maxZoom: 16,
      noWrap: true
    });
    const World_Imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 17,
      noWrap: true
    });

    this.map = L.map('map', {
      zoomControl: false, // will be added manually below
      maxBounds: L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)), // restrict view to "the world"
      zoomSnap: 0.1, // for greater granularity when fitting bounds
      attributionControl: false
    });

    // map state change events
    this.map.on('zoomstart', function () {
      // console.log('zoomstart');
      this.oldZoom = this.map.getZoom();
    }, this);

    // this.map.on('movestart', function () {
    //   console.log('movestart');
    // }, this);

    // this.map.on('resize', function () {
    //   console.log('resize');
    // }, this);

    // NB: moveend is called after zoomstart, movestart and resize
    this.map.on('moveend', function () {
      // console.log('moveend');

      // ignore initial map draw
      if (this.gotChanges) {
        const newZoom = this.map.getZoom();
        const doReQuery = newZoom <= this.oldZoom; // ignore zooming in
        this.oldZoom = newZoom;

        this.setVisible(doReQuery);
      }
    }, this);

    // add markers group
    this.map.addLayer(this.markerClusterGroup);


    // add base maps layers control
    const baseLayers = {
      'Ocean Base': Esri_OceanBasemap,
      'Nat Geo World Map': Esri_NatGeoWorldMap,
      'Open Surfer Roads': OpenMapSurfer_Roads,
      'World Topographic': World_Topo_Map,
      'World Imagery': World_Imagery
    };
    L.control.layers(baseLayers, null, { position: 'topright' }).addTo(this.map);

    // map attribution
    L.control.attribution({ position: 'bottomright' }).addTo(this.map);

    // add scale control
    L.control.scale({ position: 'bottomleft' }).addTo(this.map);

    // add zoom control
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // add reset view control
    this.map.addControl(new resetViewControl());

    // load base layer
    for (const key of Object.keys(baseLayers)) {
      if (key === this.configService.baseLayerName) {
        this.map.addLayer(baseLayers[key]);
        break;
      }
    }

    // save any future base layer changes
    this.map.on('baselayerchange', function (e: L.LayersControlEvent) {
      this.configService.baseLayerName = e.name;
    }, this);

    this.fixMap();
  }

  // to avoid timing conflict with animations (resulting in small map tile at top left of page),
  // ensure map component is visible in the DOM then update it; otherwise wait a bit...
  // ref: https://github.com/Leaflet/Leaflet/issues/4835
  // ref: https://stackoverflow.com/questions/19669786/check-if-element-is-visible-in-dom
  private fixMap() {
    if (this.elementRef.nativeElement.offsetParent) {
      this.fitBounds(); // use default bounds

      // FUTURE: restore map bounds here ?
      // this.fitBounds(this.configService.mapBounds);
    } else {
      setTimeout(this.fixMap.bind(this), 50);
    }
  }

  // called when apps list changes
  public ngOnChanges(changes: SimpleChanges) {
    // update map only if it's visible
    if (this.configService.isApplicationsMapVisible) {
      if (changes.applications && !changes.applications.firstChange && changes.applications.currentValue) {
        this.gotChanges = true;
        // console.log('map: got changed apps =', changes.applications);

        // FUTURE: for better performance, if an app is both deleted and added, ignore it (or reassign it)
        // _.intersection()?
        // _.without()?
        // _.xor()?
        const deletedApps = _.difference(changes.applications.previousValue, changes.applications.currentValue) as Array<Application>;
        const addedApps = _.difference(changes.applications.currentValue, changes.applications.previousValue) as Array<Application>;

        // (re)draw the matching apps
        this.drawMap(deletedApps, addedApps);
      }
    }
  }

  // when map becomes visible, draw all apps
  public onMapVisible() {
    // delete any old apps
    this.markerList.forEach(marker => {
      this.markerClusterGroup.removeLayer(marker);
    });
    this.markerList = []; // empty the list

    // draw all new apps
    this.drawMap([], this.applications);
  }

  public ngOnDestroy() {
    if (this.map) { this.map.remove(); }
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  /**
   * Sets which apps are currently visible.
   * Actual function executes no more than once every 250ms.
   */
  // tslint:disable-next-line:member-ordering
  private setVisible = _.debounce(this._setVisible, 250);

  /**
   * NB: Call setVisible() instead!
   */
  private _setVisible(doReQuery: boolean) {
    // console.log('setting visible');
    const mapBounds = this.map.getBounds();

    // FUTURE: save map bounds here
    // this.configService.mapBounds = mapBounds;

    // notify applications component
    if (doReQuery) {
      this.updateCoordinates.emit(this.getCoordinates(mapBounds));
    }
  }

  /**
   * Returns coordinates in GeoJSON format that specify map bounding box.
   */
  public getCoordinates(bounds: L.LatLngBounds = null): string {
    if (!bounds) {
      if (this.elementRef.nativeElement.offsetParent) {
        // actual bounds
        bounds = this.map.getBounds();
      } else {
        // map not ready yet - use default
        bounds = this.defaultBounds;
      }
    }

    // OLD CODE WITH WORKAROUND FOR API $GEOWITHIN PROJECTION BEHAVIOUR
    const west = bounds.getWest();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const north = bounds.getNorth();

    // build coordinates using right hand rule (CCW)
    let coordinates = '';
    coordinates += this.latLngToCoord(bounds.getSouthWest()) + ','; // bottom left
    for (let x = Math.ceil(west); x < east; x++) {
      coordinates += this.latLngToCoord(L.latLng(south, x)) + ','; // along the bottom
    }
    coordinates += this.latLngToCoord(bounds.getSouthEast()) + ','; // bottom right
    coordinates += this.latLngToCoord(bounds.getNorthEast()) + ','; // topright
    for (let x = Math.floor(east); x > west; x--) {
      coordinates += this.latLngToCoord(L.latLng(north, x)) + ','; // along the top
    }
    coordinates += this.latLngToCoord(bounds.getNorthWest()) + ','; // topleft
    coordinates += this.latLngToCoord(bounds.getSouthWest()) + ','; // bottom left

    // remove last comma and convert to a GeoJSON coordinates string
    // console.log('coordinates = ', coordinates);
    return `[[${coordinates.slice(0, -1)}]]`;

    // NEW CODE (USING API $BOX QUERY)
    // // return box parameters
    // return `[${this.latLngToCoord(bounds.getSouthWest())},${this.latLngToCoord(bounds.getNorthEast())}]`;
  }

  private latLngToCoord(ll: L.LatLng): string {
    return `[${ll.lng},${ll.lat}]`;
  }

  private fitBounds(bounds: L.LatLngBounds = null) {
    // console.log('fitting bounds');
    const fitBoundsOptions: L.FitBoundsOptions = {
      // use top padding to adjust for filters header (which is always visible)
      paddingTopLeft: L.point(0, this.appfilters.clientHeight),
      // disable animation to prevent known bug where zoom is sometimes incorrect
      // ref: https://github.com/Leaflet/Leaflet/issues/3249
      animate: false
    };

    if (bounds && bounds.isValid()) {
      this.map.fitBounds(bounds, fitBoundsOptions);
    } else {
      this.map.fitBounds(this.defaultBounds, fitBoundsOptions);
    }
  }

  /**
   * Removes deleted / draws added applications.
   */
  private drawMap(deletedApps: Application[], addedApps: Application[]) {
    // console.log('drawing map');
    // console.log('deleted =', deletedApps);
    // console.log('added =', addedApps);

    // remove deleted apps from list and map
    deletedApps.forEach(app => {
      const markerIndex = _.findIndex(this.markerList, { dispositionId: app.tantalisID });
      if (markerIndex >= 0) {
        const markers = this.markerList.splice(markerIndex, 1);
        this.markerClusterGroup.removeLayer(markers[0]);
      }
    });

    // draw added apps
    addedApps.forEach(app => {
      // add marker
      if (app.centroid.length === 2) { // safety check
        const title = `${app.client}\n`
          + `${app.purpose || '-'} / ${app.subpurpose || '-'}\n`
          + `${app.location}\n`;
        const marker = L.marker(L.latLng(app.centroid[1], app.centroid[0]), { title: title })
          .setIcon(markerIconYellow)
          .on('click', L.Util.bind(this.onMarkerClick, this, app));
        marker.dispositionId = app.tantalisID;
        this.markerList.push(marker); // save to list
        this.markerClusterGroup.addLayer(marker); // save to marker clusters group
      }
    });

    // DOESN'T WORK QUITE RIGHT -- ALSO NEEDS TO BE CALLED WHEN MOVING/ZOOMING AROUND THE MAP
    // // FOR FUTURE USE
    // // get number visible on map
    // let count = 0;
    // const mapBounds = this.map.getBounds();
    // for (const marker of this.markerList) {
    //   const app = _.find(this.applications, { tantalisID: marker.dispositionId });
    //   if (app) {
    //     // app is visible if map contains its marker
    //     if (mapBounds.contains(marker.getLatLng())) {
    //       count++;
    //     }
    //   }
    // }
    // console.log('numberVisible =', count);
  }

  private onMarkerClick(...args: any[]) {
    const app = args[0] as Application;
    const marker = args[1].target as L.Marker;

    // update selected item in app list
    this.toggleCurrentApp.emit(app);

    // if there's already a popup, delete it
    let popup = marker.getPopup();
    if (popup) {
      const wasOpen = popup.isOpen();
      popup.remove();
      marker.unbindPopup();
      if (wasOpen) { return; }
    }

    const popupOptions = {
      className: 'map-popup-content',
      autoPanPaddingTopLeft: L.point(40, 150),
      autoPanPaddingBottomRight: L.point(40, 20)
    };

    // compile marker popup component
    const compFactory = this.resolver.resolveComponentFactory(AppDetailPopupComponent);
    const compRef = compFactory.create(this.injector);
    compRef.instance.id = app._id;
    this.appRef.attachView(compRef.hostView);
    compRef.onDestroy(() => this.appRef.detachView(compRef.hostView));
    const div = document.createElement('div').appendChild(compRef.location.nativeElement);

    popup = L.popup(popupOptions)
      .setLatLng(marker.getLatLng())
      .setContent(div);

    // bind popup to marker so it automatically closes when marker is removed
    marker.bindPopup(popup).openPopup();
  }

  /**
   * Called when list component selects or unselects an app.
   */
  public onHighlightApplication(app: Application, show: boolean) {
    // reset icon on previous marker, if any
    if (this.currentMarker) {
      this.currentMarker.setIcon(markerIconYellow);
      this.currentMarker = null;
    }

    // set icon on new marker
    if (show) {
      const marker = _.find(this.markerList, { dispositionId: app.tantalisID });
      if (marker) {
        this.currentMarker = marker;
        marker.setIcon(markerIconYellowLg);
        // FUTURE: zoom in to this app/marker ?
        // FUTURE: show the marker popup ?
        // this.onMarkerClick(app, { target: marker });
      }
    }
  }

  public onLoadStart() { this.loading = true; }

  public onLoadEnd() { this.loading = false; }

}
