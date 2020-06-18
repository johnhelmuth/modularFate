Hooks.once('init', async function () {
    //On init, we initialise all settings and settings menus and override the HUD as required.
    console.log(`Initializing manageAspects`);
    //We will be using this setting to store the world's list of aspects.
    
    game.settings.register("modularFate", "aspects", {
        name: "Aspects",
        hint: "This is the list of aspects for this particular world.",
        scope: "world",
        config: false,
        type: Object
    });
    //Initialise the setting if it is currently empty.
    if (jQuery.isEmptyObject(game.settings.get("modularFate","aspects"))){
        game.settings.set("modularFate","aspects",[]);
    }

    // Register the menu to setup the world's aspect list.
    game.settings.registerMenu("modularFate","AspectSetup", {
        name:"Aspect Setup",
        label:"Setup",
        hint:"Configure character aspects for this world.",
        type:AspectSetup,
        restricted:true
    });

    // Register a setting for replacing the existing aspect list with one of the pre-defined default sets.
    game.settings.register("modularFate", "defaultAspects", {
        name: "Replace Or Clear Aspect List?",
        hint: "Pick an aspect set with which to override the world's current aspects. CANNOT BE UNDONE.",
        scope: "world",     // This specifies a client-stored setting
        config: true,        // This specifies that the setting appears in the configuration view
        type: String,
        restricted:true,
        choices: {           // If choices are defined, the resulting setting will be a select menu
            "nothing":"No",
            "fateCore":"Yes - Fate Core Aspects",
            "fateCondensed":"Yes - Fate Condensed Aspects",
            "accelerated":"Yes - Fate Accelerated Aspects",
            "clearAll":"Yes - Clear All Aspects"
        },
        default: "nothing",        // The default value for the setting
        onChange: value => { // A callback function which triggers when the setting is changed
                if (value == "fateCore"){
                    game.settings.set("modularFate","aspects",ModularFateConstants.getFateCoreAspects());
                }
                if (value == "fateCondensed"){
                    game.settings.set("modularFate","aspects",ModularFateConstants.getFateCondensedAspects());
                }
                if (value=="clearAll"){
                    game.settings.set("modularFate","aspects",[]);
                }
                if (value=="accelerated"){
                    game.settings.set("modularFate","aspects",ModularFateConstants.getFateAcceleratedAspects());
                }
                //This menu only does something when changed, so set back to 'nothing' to avoid
                //confusing or worrying the GM next time they open this menu.
                game.settings.set("modularFate","defaultAspects","nothing");
            }
    });
});

//AspectSetup: This is the class called from the options to view and edit the aspects.
class AspectSetup extends FormApplication{
    constructor(...args){
        super(...args);
    }
    //Set up the default options for instances of this class
    static get defaultOptions() {
        const options = super.defaultOptions; //begin with the super's default options
        //The HTML file used to render this window
        options.template = "systems/modularFate/templates/AspectSetup.html"; 
        options.width = "auto";
        options.height = "auto";
        options.title = `Setup character aspects for world ${game.world.title}`;
        options.closeOnSubmit = true;
        options.id = "AspectSetup"; // CSS id if you want to override default behaviors
        options.resizable = false;
        return options;
    }
    //The function that returns the data model for this window. In this case, we only need the game's aspect list.
    getData(){
        this.aspects=game.settings.get("modularFate","aspects");
        const templateData = {
           aspects:this.aspects
        }
        return templateData;
    }
    
    //Here are the action listeners
    activateListeners(html) {
        super.activateListeners(html);
        const editButton = html.find("button[id='editAspect']");
        const deleteButton = html.find("button[id='deleteAspect']");
        const addButton = html.find("button[id='addAspect']");
        const selectBox = html.find("select[id='aspectListBox']");

        editButton.on("click", event => this._onEditButton(event, html));
        deleteButton.on("click", event => this._onDeleteButton(event, html));
        addButton.on("click", event => this._onAddButton(event, html));
        selectBox.on("dblclick", event => this._onEditButton(event, html));

        Hooks.on('closeEditAspect',async () => {
            this.render(true);
        })
    }

    //Here are the event listener functions.
    async _onEditButton(event,html){
        //Launch the EditSkill FormApplication.
        let aspects = game.settings.get("modularFate","aspects");
        let aspect = html.find("select[id='aspectListBox']")[0].value;
        for (let i = 0; i< aspects.length; i++){
            if (aspects[i].name==aspect){
                let e = new EditAspect(aspects[i]);
                e.render(true);       
            }
        }
    }
    async _onDeleteButton(event,html){
        //Code to delete the selected aspect
        //First, get the name of the aspect from the HTML element aspectListBox
        let aspect = html.find("select[id='aspectListBox'")[0].value;
        
        //Find that aspect in the list of aspects
        let aspects=game.settings.get("modularFate","aspects");
        var index=undefined;
        for (let i = 0;i<aspects.length; i++){
            if (aspects[i].name === aspect){
                index = i;
            }
        }
        //Use splice to cut that aspect out of the list of aspects
        if (index != undefined){
            aspects.splice(index,1);
            //Set the game settings for aspects as appropriate.
            await game.settings.set("modularFate","aspects",aspects);
            this.render(true); 
        }
    }
    async _onAddButton(event,html){
        //Launch the EditAspect FormApplication.
        let e = new EditAspect(undefined);
        e.render(true);
    }
}//End AspectSetup

//EditAspect: This is the class to edit a specific Aspect
class EditAspect extends FormApplication{
    constructor(aspect){
            super(aspect);
            this.aspect=aspect;
            if (this.aspect==undefined){
                this.aspect={
                    "name":"",
                    "description":""
                }
            }
        }

    //Here are the action listeners
    activateListeners(html) {
        super.activateListeners(html);
        const saveButton = html.find("button[id='edit_aspect_save_changes']");
        saveButton.on("click", event => this._onSaveButton(event, html));
    }
        
    //Here are the event listener functions.
    async _onSaveButton(event,html){
        //Get the name and description of the aspect
        let name = html.find("input[id='edit_aspect_name']")[0].value;
        let description = html.find("textarea[id='edit_aspect_description']")[0].value;
        let aspects=game.settings.get("modularFate","aspects");
        let newAspect = {"name":name, "description":description};
        var existing = false;
        //First check if we already have an aspect by that name, or the aspect is blank; if so, throw an error.
        if (name == undefined || name ==""){
            ui.notifications.error("You cannot have an aspect with a blank name.")
        } else {
            for (let i =0; i< aspects.length; i++){
                if (aspects[i].name == name){
                    aspects[i]=newAspect;
                    existing = true;
                }
            } 
        }
        if (!existing){            
            aspects.push(newAspect);
        }
        await game.settings.set("modularFate","aspects",aspects);
        this.close();
    }    

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.template = "systems/modularFate/templates/EditAspect.html"; 
    
        //Define the FormApplication's options
        options.width = "1000";
        options.height = "auto";
        options.title = `Skill Editor`;
        options.closeOnSubmit = true;
        options.id = "EditSkill"; // CSS id if you want to override default behaviors
        options.resizable = true;
        return options;
    }
    getData(){
        const templateData = {
           aspect:this.aspect
        }
        return templateData;
        }
}