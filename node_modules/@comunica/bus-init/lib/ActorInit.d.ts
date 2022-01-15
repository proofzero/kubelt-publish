/// <reference types="node" />
import type { Readable } from 'stream';
import type { IAction, IActorOutput, IActorTest, IActorArgs } from '@comunica/core';
import { Actor } from '@comunica/core';
/**
 * A base actor for listening to init events.
 *
 * Actor types:
 * * Input:  IActionInit:      Contains process information
 *                             such as the list of arguments,
 *                             environment variables and input stream.
 * * Test:   <none>
 * * Output: IActorOutputInit: Contains process output streams.
 *
 * @see IActionInit
 */
export declare abstract class ActorInit extends Actor<IActionInit, IActorTest, IActorOutputInit> {
    constructor(args: IActorArgs<IActionInit, IActorTest, IActorOutputInit>);
}
/**
 * The init input, which contains the program arguments.
 */
export interface IActionInit extends IAction {
    /**
     * The list of program arguments.
     */
    argv: string[];
    /**
     * The mapping of environment variables.
     */
    env: Record<string, string | undefined>;
    /**
     * A standard input stream.
     */
    stdin: Readable;
}
export interface IActorOutputInit extends IActorOutput {
    /**
     * A standard error output stream.
     */
    stderr?: Readable;
    /**
     * A standard output stream.
     */
    stdout?: Readable;
}
