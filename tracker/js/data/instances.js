'use strict';

var INSTANCE_GROUPS = {
    groupHardNormal: [
        { id: 'ara-infernalia', name: 'Ara Infernalia (normal)', maxRuns: 4 },
        { id: 'beninerk', name: "Beninerk's Manor (normal)", maxRuns: 4 },
        { id: 'stella', name: 'Stella Dev. Laboratory (normal)', maxRuns: 4 },
        { id: 'makarna', name: 'Makarna of Bitterness (difficult)', maxRuns: 4 },
        { id: 'prometun', name: "Prometun's Workshop (difficult)", maxRuns: 4 },
        { id: 'benshmundir', name: 'Benshmundir S. Temple (normal)', maxRuns: 4 },
        { id: 'dokkaebi', name: 'Dokkaebi Realm', maxRuns: 4 },
        { id: 'raksha', name: 'Burning Blood Fortress (S - rank)', maxRuns: 3 }
    ],
    groupEasyNormal: [
        { id: 'senekta', name: 'Senekta', maxRuns: 2 }
    ],
    solo: []
};

var DUCAT_INSTANCES = INSTANCE_GROUPS.groupHardNormal.concat(INSTANCE_GROUPS.groupEasyNormal);
