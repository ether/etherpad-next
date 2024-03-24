# Technical Documentation

This documentation is for Etherpad-next collaborator.

## Technologies Used

- [React][]
- [Tailwind][]
- [Next.js][]
- [PostCSS][]
- [TypeScript][]
- [Storybook][]
- [prisma](https://www.prisma.io)
- [`lucide-react`](https://www.lucide.dev)

- [prettier](https://www.prettier.io)
- [eslint](https://www.eslint.org)
- [stylelint](https://www.stylelint.io)

## Setup

### Development

```bash
docker compose up -d
docker compose exec app npm i
# creates db structure without using migrations
docker compose exec app npx prisma db push
docker compose exec app npx turbo dev
```

## Creating React Components

We uses [React][] as a Frontend Library to develop the Website.
React allows us to create user interfaces with a modern take on Web Development.

If you're unfamiliar with React or Web Development in general, we encourage a read before taking on complex issues and tasks as this repository is **not for educational purposes** and we expect you to have a basic understanding of the technologies used.

We also recommend getting familiar with technologies such as [Next.js][], [PostCSS][], and "concepts" such as "CSS Modules" and "CSS-in-JS".

### Styling a Component

As mentioned, we write all Component-styles in separate `.module.css` files. This is like writing any CSS in a separate file (besides the fact that we use [PostCSS][]).

This concept of writing styles on dedicated CSS files and importing them within JavaScript (or React) is a pattern named **[CSS Module](https://github.com/css-modules/css-modules)**.
These allow us to write PostCSS (or regular CSS, or any flavor of CSS if you have a way of interpreting it) within a `.module.css` and import the class names directly to our React Components.
We recommend reading guides on "Styling React Components with CSS Modules", which there are many available on the web.

It's important to mention that we use [Tailwind][] as a CSS Framework. Hence, margins, paddings, font sizes, font weights, colors, and other sorts of styles are all provided with Tailwind.
We recommend reading [Tailwind Docs](https://tailwindcss.com/docs/preflight) to get familiar with Tailwind's styles.
We also recommend reading [this guide for setting up Tailwind on your IDE](https://tailwindcss.com/docs/editor-setup).

Finally, if you're unfamiliar with how to use Tailwind or how to use Tailwind within CSS Modules, we recommend reading [this guide](https://tailwindcss.com/docs/using-with-preprocessors).

#### Example of a CSS Module

```css
.myComponent {
  @apply some
    tailwind
    classes;
}
```

#### Guidelines when writing CSS

- We use camelCase for defining CSS classes
- We use Tailwind's `@apply` selector to apply Tailwind Tokens
  - We discourage the usage of any plain CSS styles and tokens, when in doubt ask for help
  - We require that you define one Tailwind Token per line, just as shown on the example above, since this improves readability
- Only write CSS within CSS Modules, avoid writing CSS within JavaScript files
- We recommend creating mixins for reusable animations, effects and more
  - You can create Mixins within the `styles/mixins` folder

> \[!NOTE]\
> Tailwind is already configured for this repository. You don't need to import any Tailwind module within your CSS module.\
> You can apply Tailwind Tokens with Tailwind's `@apply` CSS rule. [Read more about applying Tailwind classes with `@apply`](https://tailwindcss.com/docs/functions-and-directives#apply).

### Best practices when creating a Component

- All React Components should be placed within the `components` folder.
- Each Component should be placed, whenever possible, within a sub-folder, which we call the "Domain" of the Component
  - The domain represents where these Components belong to or where they will be used.
  - For example, Components used within Article Pages or that are part of the structure of an Article or the Article Layouts,
    should be placed within `components/Article`
- Each component should have its folder with the name of the Component
- The structure of each component folder follows the following template:
  ```text
  - ComponentName
    - index.tsx // the component itself
    - index.module.css // all styles of the component are placed there
    - index.stories.tsx // component Storybook stories
  ```
- React Hooks belonging to a single Component should be placed within the Component's folder
  - If the Hook as a wider usability or can be used by other components, it should be placed in the root `hooks` folder.
- If the Component has "sub-components" they should follow the same philosophy as the Component itself.
  - For example, if the Component `ComponentName` has a sub-component called `SubComponentName`,
    then it should be placed within `ComponentName/SubComponentName`

#### How a new Component should look like when freshly created

```tsx
import styles from './index.module.css';
import type { FC } from 'react';

type MyComponentProps = {}; // The types of the Props of your Component

const MyComponent: FC<MyComponentProps> = ({ prop1, prop2... }) => (
  // Actual code of my Component
);

export default MyComponent;
```

### Best practices for Component development in general

- Only spread props `{ ... }` on the definition of the Component (Avoid having a variable named `props`)
- Avoid importing `React`, only import the modules from React that you need
- When importing types, use `import type { NameOfImport } from 'module'`
- When defining a Component, use the `FC` type from React to define the type of the Component
  - When using `children` as a prop, use the `FC<PropsWithChildren<MyComponentProps>>` type instead
  - Alternatively you can define your type as `type MyComponentProps = PropsWithChildren<{ my other props }>`
- Each Props type should be prefixed by the name of the Component
- Components should always be the `default` export of a React Component file
- Avoid using DOM/Web APIs/`document`/`window` API access within a React Component.
  Use utilities or Hooks when you need a Reactive state
- Avoid making your Component too big. Deconstruct it into smaller Components/Hooks whenever possible

## Unit Tests and Storybooks

We use [Storybook][] to document our components. Each component should have a storybook story that documents the component's usage.

### General Guidelines for Storybooks

Storybooks are an essential part of our development process. They help us to document our components and to ensure that the components are working as expected.

They also allow Developers to preview Components and be able to test them manually/individually to the smallest unit of the Application. (The individual Component itself).

**Storybooks should be fully typed and follow the following template:**

```tsx
import NameOfComponent from '@components/PathTo/YourComponent';
import type { Meta as MetaObj, StoryObj } from '@storybook/react';

type Story = StoryObj<typeof NameOfComponent>;
type Meta = MetaObj<typeof NameOfComponent>;

// If the component has any props that are interactable, they should be passed here
// We recommend reading Storybook docs for args: https://storybook.js.org/docs/react/writing-stories/args
export const Default: Story = {};

// If the Component has more than one State/Layout/Variant, there should be one Story for each variant
export const AnotherStory: Story = {
  args: {},
};

export default { component: NameOfComponent } as Meta;
```

- Stories should have `args` whenever possible, we want to be able to test the different aspects of a Component
- Please follow the template above to keep the Storybooks as consistent as possible
- We recommend reading previous Storybooks from the codebase for inspiration and code guidelines.
- If you need to decorate/wrap your Component/Story with a Container/Provider, please use [Storybook Decorators](https://storybook.js.org/docs/react/writing-stories/decorators)

[Storybook]: https://storybook.js.org/
[Next.js]: https://nextjs.org/
[PostCSS]: https://postcss.org/
[React]: https://react.dev/
[Tailwind]: https://tailwindcss.com/
[TypeScript]: https://www.typescriptlang.org
