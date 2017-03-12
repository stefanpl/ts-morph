﻿import {expect} from "chai";
import {EnumDeclaration} from "./../../../compiler";
import {getInfoFromText} from "./../testHelpers";

describe(nameof(EnumDeclaration), () => {
    describe(nameof<EnumDeclaration>(d => d.addMember), () => {
        it("should add a member without a value", () => {
            const {firstChild, sourceFile} = getInfoFromText<EnumDeclaration>("enum MyEnum {\n}\n");
            firstChild.addMember({
                name: "myName",
                value: 5
            });
            expect(sourceFile.getFullText()).to.equal("enum MyEnum {\n    myName = 5\n}\n");
        });
    });
});
