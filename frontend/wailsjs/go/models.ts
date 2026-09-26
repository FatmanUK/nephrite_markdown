export namespace main {
	
	export class FileResponse {
	    name: string;
	    content: string;
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new FileResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.content = source["content"];
	        this.error = source["error"];
	    }
	}

}

