import {Store, StoreOptions} from 'vuex';
import {action, module, mutation} from '../src';
import {expect} from 'chai';

///////////////////////////////////////
// Boilerplate for type-checking etc //
///////////////////////////////////////

// Keys are action names, declared type is expected when calling dispatch()
type actions = {
  getFoo: string;
  moreFoo: null;
  testRoot: null;
}

// Keys are mutation names, declared type is expected when calling commit()
type mutations = {
  setFoo: string;
}

// Enforce/enable type checking of commit and dispatch calls at compile time
type TypedDispatch = <T extends keyof actions>(type: T, value?: actions[T] ) => Promise<any[]>;
type TypedCommit = <T extends keyof mutations>(type: T, value?: mutations[T] ) => void;

// All modules should extend TypedStore for complile time type checking
// this class is never used at runtime, it's just a shim for typing
class TypedStore extends Store<any> {
  constructor() {
    super({}); // Make Vuex.Store happy
  }
  commit: TypedCommit;
  dispatch: TypedDispatch;
}

//////////////
// Examples //
//////////////

@module
class SubModule extends TypedStore {
  public actions: actions;
  public mutations: mutations;
  private rootState: any;
  private rootGetters: any;
  private foo: String = 'foo';
  private get foobar(): String {
    return `${this.foo} bar`;
  }
  @action
  getFoo(value: string = 'fu') {
    this.commit('setFoo', value);
    return Promise.resolve('hi');
  }
  @action
  moreFoo() {
    this.dispatch('getFoo', 'fee');
  }
  @action
  testRoot() {
    return Promise.resolve({
      rootGetters: this.rootGetters,
      rootState: this.rootState
    });
  }
  @mutation
  setFoo(foo:String) {
    this.foo = foo;
  }
}

@module({
  store: true,
  modules: {
    submodule: new SubModule()
  }
})
class TestStore extends TypedStore {
  submodule: SubModule;
  private message = 'Hello';
  private get fullMessage(): string {
    return this.message + ' World';
  }
}

describe('@module decorator', () => {
  it('returns a constructor', () => {
    expect(SubModule).to.be.a('function');
  });
  describe('when store == true', () => {
    it('creates a Vuex.Store instance', () => {
      expect(new TestStore()).to.be.an.instanceof(Store);
    });
    it('does not extend TypedStore at runtime (used only for type inference)', () => {
      expect(new TestStore()).to.not.be.an.instanceof(TypedStore);
    });
  });
  describe('when store != true', () => {
    it('creates a module (StoreOptions compliant object)', () => {
      let sub = new SubModule();
      expect(sub.actions).to.not.be.undefined;
      expect(sub.getters).to.not.be.undefined;
      expect(sub.state).to.not.be.undefined;
      expect(sub.mutations).to.not.be.undefined;
    });
    it('does not extend TypedStore at runtime (used only for type inference)', () => {
      expect(new SubModule()).to.not.be.an.instanceof(TypedStore);
    });
  });
  describe('transforms class', () => {
    it('sets state', () => {
      const store = new TestStore();
      expect(store.state.message).to.eq('Hello');
      expect(store.state.submodule.foo).to.eq('foo');
    });
    it('maps getters', () => {
      const store = new TestStore();
      const desc = Object.getOwnPropertyDescriptor(store.getters, 'foobar');
      expect(desc.get).to.be.a('function');
      expect(store.getters.foobar).to.equal('foo bar');
    });
  });
});

describe('@action decorator', () => {
  let store: TestStore;
  let module: SubModule;
  it('adds methods to “actions” object', () => {
    module = new SubModule();
    expect(module.actions.getFoo).to.be.a('function');
  });
  it('can call other actions', () => {
    store = new TestStore();
    store.dispatch('getFoo');
    expect(store.state.submodule.foo).to.eq('fu');
    store.dispatch('moreFoo');
    expect(store.state.submodule.foo).to.eq('fee');
  });
  it('can commit mutations', () => {
    store = new TestStore();
    expect(store.state.submodule.foo).to.not.eq('fu');
    const p = store.dispatch('getFoo');
    expect(store.state.submodule.foo).to.eq('fu');
  });
  it('can return a promise', (done) => {
    store = new TestStore();
    const p = store.dispatch('getFoo');
    expect(p).to.be.an.instanceOf(Promise);
    p.then(msg => {
      expect(msg).to.eq('hi');
      done();
    }).catch(done);
  });
  it('can access rootState and rootGetters', (done) => {
    store = new TestStore();
    store.dispatch('testRoot').then((props: any) => {
      const {rootGetters, rootState} = props;
      expect(rootGetters.fullMessage).to.eq('Hello World');
      expect(rootState.message).to.eq('Hello');
      expect(rootState.submodule.foo).to.eq('fu');
      done();
    }).catch(done);
  });

  // TODO: Write tests for mutation decorator
});