export class ModularFateCharacter extends ActorSheet {

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.width="860"
        return options;
    }

    get actorType() {
        return this.actor.data.type;
    }

    get template(){
        return 'systems/ModularFate/templates/ModularFateSheet.html';
    }

    //Here are the action listeners
    activateListeners(html) {
        super.activateListeners(html);
        const skillsButton = html.find("button[id='edit_player_skills']");;
        //skillsButton.on("click", event => this._onSkillsButton(event, html));
        const skill_name=html.find("div[name='skill']");
        skill_name.on("click", event => this._onSkill_name(event, html));
        //const sort = html.find("button[id='sort_player_skills'")
        //sort.on("click", event => this._onSortButton(event, html));
        const aspectName = html.find("div[name='aspect']")
        aspectName.on("dblclick", event => this._onAspectDblClick(event, html));
        const box = html.find("button[name='box']");
        box.on("click", event => this._on_click_box(event, html));
        const skills_block = html.find("div[name='skills_block']");
        skills_block.on("dblclick", event => this._onSkillsButton(event, html));
        skills_block.on("contextmenu", event => this._onSortButton(event, html));

        const tracks_block = html.find("div[name='tracks_block']");
        const stunts_block = html.find("div[name='stunts_block']");
        tracks_block.on("dblclick", event => this._onTracks_dblclick(event, html));
        stunts_block.on("dblclick", event => this._onStunts_dblclick(event, html))

        Hooks.on('closeEditPlayerTracks',async () => {
            this.updateTracks();
            this.render(false);
        })

        Hooks.on('closeEditPlayerSkills',async () => {
            this.updateTracks();
            this.render(false);
        })
    }

    //Here are the event listener functions.
    async _onTracks_dblclick(event, html){
        if (game.user.isGM){
            console.log("Tracks double clicked")
        }

    }
    async _onStunts_dblclick(event, html){
        if (game.user.isGM){
            console.log("Stunts double clicked")
        }
    }

    async _on_click_box(event, html){
        let id = event.target.id;
        let parts = id.split("_");
        let name = parts[0]
        let index = parts[1]
        let checked = parts[2]
        index = parseInt(index)
        if (checked == "true"){
            checked = true
        }
        if (checked == "false"){
            checked = false
        }
        let tracks = duplicate(this.object.data.data.tracks);
        let track = tracks[name]
        track.box_values[index]=checked;
        if (this.object.isToken){
            //await this.object.token.update({["actorData.data.tracks"]:[]})
            await this.object.token.update({["actorData.data.tracks"]:tracks})
        } else {
            //await this.object.update({["data.tracks"]:[]})
            await this.object.update({["data.tracks"]:tracks})
        }
    }

    async _onAspectDblClick(event, html){
        if (game.user.isGM){
            let aspects = duplicate(this.object.data.data.aspects);
            let aspect = aspects[event.target.id]
            let replacement = await ModularFateConstants.getInput("What is the new name?");
            let description = await ModularFateConstants.getInput("What is the new description?");

            if (replacement != ""){
                //Delete the existing aspect ready for replacement
               delete aspects[aspect.name]
               let sk = `-=${aspect.name}`
                if (this.object.isToken){
                    await this.object.token.update({["actorData.data.aspects"]:{[`${sk}`]:null}});
                } else {
                    await this.object.update({"data.aspects": {[`${sk}`]:null}})
                }
                aspect.name=replacement;
                aspect.description = description;
                aspects[replacement]=aspect;
                if (this.object.isToken){
                    await this.object.token.update({["actorData.data.aspects"]:aspects});
                } else {
                    await this.object.update({"data.aspects":aspects});
               }
            }
        }
    }
    async _onSkillsButton(event, html){
        this.dblclickinprogress = true;
        //Launch the EditPlayerSkills FormApplication.
        let editor = new EditPlayerSkills(this.actor);//Passing the actor works SOO much easier.
        editor.render(true);
        this.dblclickinprogress = false;
    }
    async _onSortButton(){
        if (this.sortByRank == undefined){
            this.sortByRank == true;
        }
        this.sortByRank=!this.sortByRank;
        this.render(false);
    }

    async _onSkill_name(event, html){
        if (this.dblclickinprogress){
            return
        }
        let r = new Roll(`4dF + ${this.object.data.data.skills[event.target.id].rank}`);
        let roll = r.roll();

        roll.toMessage({
            flavor: `<h1>${event.target.id}</h1>`,
            speaker:ChatMessage.getSpeaker()
        });
    }

    async initialise(){
        // Logic to set up Refresh and Current
        let refresh = game.settings.get("ModularFate","refreshTotal");
    
        if (this.object.data.data.details.fatePoints.refresh ==""){
            if (this.object.isToken){
                await this.object.token.update({["actorData.data.details.fatePoints.refresh"]:refresh});
                await this.object.token.update({["actorData.data.details.fatePoints.current"]:refresh});
            } else {
                await this.object.update({"data.details.fatePoints.refresh":refresh})    
                await this.object.update({"data.details.fatePoints.current":refresh})
            }
        }

        // Logic to set up aspects if this character doesn't already have them
        if (Object.keys(this.object.data.data.aspects)==0){
            let aspects = game.settings.get("ModularFate","aspects");
            let player_aspects = duplicate(aspects);
            for (let a in player_aspects){
                player_aspects[a].value = "";
            }
            //Now to store the aspect list to the character
            if (this.object.isToken){
                await this.object.token.update({["actorData.data.aspects"]:player_aspects});
            } else {
                await this.object.update({"data.aspects":player_aspects})    
            }
        }

        //Step 0.5 check to see if the character already has tracks on it.
        
        if (Object.keys(this.object.data.data.tracks).length==0){
            //Step one, get the list of universal aspects.
            let world_tracks = duplicate(game.settings.get("ModularFate","tracks"));
            let tracks_to_write = duplicate(this.object.data.data.tracks);
            for (let t in world_tracks){
                let track = world_tracks[t];
                if (track.universal == true){
                    tracks_to_write[t]=world_tracks[t];
                }
            }
            for (let t in tracks_to_write){
                let track = tracks_to_write[t];
                //Add a notes field. This is a bit redundant for stress tracks,
                //but useful for aspects, indebted, etc. Maybe it's configurable whether we show the
                //notes or not for any given track.
                track.notes="";

                //If this box is an aspect when marked, it needs an aspect.name data field.
                if (track.aspect == "Defined when marked"){
                    track.aspect = {};
                    track.aspect.name="";
                    track.aspect.when_marked = true;
                    track.aspect.as_name = false;
                }
                console.log(track)
                if (track.aspect == "Aspect as name"){
                    track.aspect = {};
                    track.aspect.name="";
                    track.aspect.when_marked = true;
                    track.aspect.as_name = false;
                }
                
                //Initialise the box array for this track 
                if (track.boxes > 0){
                    let box_values = [];
                    for (let i = 0; i < track.boxes; i++){
                        box_values.push(false);
                    }
                    track.box_values = box_values;
                }
            }
            //We're ready to save the boxes to the character sheet (gulp)
            if (this.object.isToken){
                await this.object.token.update({["actorData.data.tracks"]:tracks_to_write});
            } else {
                await this.object.update({"data.tracks":tracks_to_write})    
            } 
        }
        this.render(false);
    }

    async updateTracks(){
        let tracks = duplicate(this.object.data.data.tracks);
        //TODO: Work out correct number of boxes to render for each track and store that. This will be stored as an array of booleans attached to each stress track.
        let categories = game.settings.get("ModularFate","track_categories");
        //GO through all the tracks, find the ones with boxes, check the number of boxes and linked skills and initialise as necessary.
        for (let t in tracks){
            let track = tracks[t];

            if (track.universal){
                track.enabled = true;       
            }

            // Check for linked skills and enable/add boxes as necessary.
            if (track.linked_skills != undefined && track.linked_skills.length > 0 && Object.keys(this.object.data.data.skills).length >0 ){
                let skills = this.object.data.data.skills;
                let linked_skills = tracks[t].linked_skills;
                let box_mod = 0;
                for (let i=0; i< linked_skills.length; i++){
                    let l_skill = linked_skills[i].linked_skill;
                    let l_skill_rank = linked_skills[i].rank;
                    let l_boxes = linked_skills[i].boxes;
                    let l_enables = linked_skills[i].enables;

                    //Get the value of the player's skill
                    
                    let skill_rank = this.object.data.data.skills[l_skill].rank;
                    //If this is 'enables' and the skill is too low, disable.
                    if (l_enables && skill_rank < l_skill_rank){
                        track.enabled = false;
                    }
                    
                    //If this adds boxes and the skill is high enough, add boxes if not already present.
                    //Telling if the boxes are already present is the hard part.
                    //If boxes.length > boxes it means we have added boxes, but how many? I think we need to store a count and add
                    //or subract them at the end of our run through the linked skills.

                    if (l_boxes > 0 && skill_rank >= l_skill_rank){
                        box_mod += l_boxes;
                    }
                } //End of linked_skill iteration
                //Now to add or subtract the boxes

                //Only if this track works with boxes, though
                if (track.boxes > 0 || track.box_values != undefined){
                    //If boxes + box_mod is greater than box_values.length add boxes
                    let toModify = track.boxes + box_mod - track.box_values.length;
                    if (toModify > 0){
                        for (let i = 0; i< toModify; i++){
                            track.box_values.push(false);
                        }
                    }
                    //If boxes + box_mod is less than box_values.length subtract boxes.
                    if (toModify < 0){
                        for (let i = toModify; i<0; i++){
                                track.box_values.pop();
                        }
                    }
                }   
            }
        }
        // We're ready to save the boxes to the character sheet (gulp)
        console.log(this.object.isToken)
        if (this.object.isToken){
            await this.object.token.update({["actorData.data.tracks"]:tracks});
        } else {
            await this.object.update({"data.tracks":tracks})    
        } 
    }
  
    async getData() {
        this.initialise();
        this.refreshSpent = 0; //Will increase when we count tracks with the Paid field and stunts.
        this.freeStunts = game.settings.get("ModularFate","freeStunts");
        const sheetData = super.getData();
        let numStunts = Object.keys(sheetData.data.stunts).length;
        let paidTracks = 0;
        let paidStunts = 0;
        let paidExtras = 0;

        let tracks = duplicate(sheetData.data.tracks);
        for (let track in tracks){
            if (tracks[track].paid){
                paidTracks++;
            }
        }
        paidStunts = numStunts - paidStunts;
        //TODO: Add code to count the cost of paid for extras, too.
        this.refreshSpent = paidTracks + paidStunts + paidExtras;
        let isPlayer = this.object.isPC;
        let error = false;
        if (isPlayer){
            let checkSpent = sheetData.data.details.fatePoints.refresh - this.refreshSpent;
            let checkWorld = game.settings.get("ModularFate","refreshTotal") - sheetData.data.details.fatePoints.refresh;

            let message = "This player's sheet doesn't add up: "
            if (checkWorld < 0 ){
                message += "Their refresh is greater than the game refresh."
                error = true;
            }
            if (checkSpent < 0){
                if (error){
                    message += "and their spent refresh is greater than their refresh."    
                }
                message += "Their spent refresh is greater than their refresh."
                error = true;
            }
            if (error){ 
                ui.notifications.error(message);
            }
        }
        const unordered_skills = sheetData.data.skills;
        const ordered_skills = {}; 
        let sorted_by_rank = ModularFateConstants.sortByRank(unordered_skills);
        
        // Sort the skills to display them on the character sheet.
        Object.keys(unordered_skills).sort().forEach(function(key) {ordered_skills[key] = unordered_skills[key];});//You can use this code to sort a JSON object by creating a replacement object.
        sheetData.ordered_skills = ordered_skills;
        sheetData.sorted_by_rank = sorted_by_rank;
        sheetData.gameRefresh=game.settings.get("ModularFate","refreshTotal");

        let skillTotal =0;
        for (let s in ordered_skills){
            skillTotal+=ordered_skills[s].rank;
        }

        sheetData.skillTotal = skillTotal;
        sheetData.refreshSpent = this.refreshSpent;
        sheetData.ladder = ModularFateConstants.getFateLadder();
        sheetData.sortByRank=this.sortByRank;
        sheetData.gameSkillPoints = game.settings.get("ModularFate","skillTotal")
        sheetData.GM = game.user.isGM;

        let track_categories = game.settings.get("ModularFate","track_categories");
        sheetData.track_categories = track_categories;
        sheetData.tracks = this.object.data.data.tracks;

        return sheetData;
    }
}