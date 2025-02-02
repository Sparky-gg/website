import { interpret } from '@/interpreter/interpreter'
import { parse } from '@/interpreter/parser'
import { changeLanguage } from '@/interpreter/translator'
import { ForeachStatement, SetVariableStatement } from '@/interpreter/statement'
import { ListExpression } from '@/interpreter/expression'
import { RuntimeError } from '@/interpreter/error'

beforeAll(() => {
  changeLanguage('system')
})

afterAll(() => {
  changeLanguage('en')
})

describe('for each', () => {
  describe('parse', () => {
    test('with single statement in body', () => {
      const stmts = parse(`
      for each elem in [] do
        set x to elem + 1
      end
    `)
      expect(stmts).toBeArrayOfSize(1)
      expect(stmts[0]).toBeInstanceOf(ForeachStatement)
      const foreachStmt = stmts[0] as ForeachStatement
      expect(foreachStmt.elementName.lexeme).toBe('elem')
      expect(foreachStmt.iterable).toBeInstanceOf(ListExpression)
      expect(foreachStmt.body).toBeArrayOfSize(1)
      expect(foreachStmt.body[0]).toBeInstanceOf(SetVariableStatement)
    })

    test('with multiple statements in body', () => {
      const stmts = parse(`
      for each elem in [] do
        set x to elem + 1
        set y to elem - 1
      end
    `)
      expect(stmts).toBeArrayOfSize(1)
      expect(stmts[0]).toBeInstanceOf(ForeachStatement)
      const foreachStmt = stmts[0] as ForeachStatement
      expect(foreachStmt.elementName.lexeme).toBe('elem')
      expect(foreachStmt.iterable).toBeInstanceOf(ListExpression)
      expect(foreachStmt.body).toBeArrayOfSize(2)
      expect(foreachStmt.body[0]).toBeInstanceOf(SetVariableStatement)
      expect(foreachStmt.body[1]).toBeInstanceOf(SetVariableStatement)
    })
  })
  describe('execute', () => {
    test('empty iterable', () => {
      const echos: string[] = []
      const context = {
        externalFunctions: [
          {
            name: 'echo',
            func: (_: any, n: any) => {
              echos.push(n.toString())
            },
            description: '',
          },
        ],
      }

      const { frames } = interpret(
        `
          for each num in [] do
            echo(num)
          end
          `,
        context
      )
      expect(frames).toBeArrayOfSize(1)
      expect(frames[0].status).toBe('SUCCESS')
      expect(frames[0].variables).toBeEmpty()
      expect(echos).toBeEmpty()
    })
    test('once', () => {
      const echos: string[] = []
      const context = {
        externalFunctions: [
          {
            name: 'echo',
            func: (_: any, n: any) => {
              echos.push(n.toString())
            },
            description: '',
          },
        ],
      }

      const { frames } = interpret(
        `
        for each num in [1] do
          echo(num)
        end
      `,
        context
      )
      expect(frames).toBeArrayOfSize(2)
      expect(frames[0].status).toBe('SUCCESS')
      expect(frames[0].variables).toBeEmpty()
      expect(frames[1].status).toBe('SUCCESS')
      expect(frames[1].variables).toMatchObject({ num: 1 })
      expect(echos).toEqual(['1'])
    })
    test('multiple times', () => {
      const echos: string[] = []
      const context = {
        externalFunctions: [
          {
            name: 'echo',
            func: (_: any, n: any) => {
              echos.push(n.toString())
            },
            description: '',
          },
        ],
      }

      const { frames } = interpret(
        `
        for each num in [1, 2, 3] do
          echo(num)
        end
      `,
        context
      )
      expect(frames).toBeArrayOfSize(6)
      expect(frames[0].status).toBe('SUCCESS')
      expect(frames[0].variables).toBeEmpty()
      expect(frames[1].status).toBe('SUCCESS')
      expect(frames[1].variables).toMatchObject({ num: 1 })
      expect(frames[2].status).toBe('SUCCESS')
      expect(frames[3].status).toBe('SUCCESS')
      expect(frames[3].variables).toMatchObject({ num: 2 })
      expect(frames[4].status).toBe('SUCCESS')
      expect(frames[5].status).toBe('SUCCESS')
      expect(frames[5].variables).toMatchObject({ num: 3 })
      expect(echos).toEqual(['1', '2', '3'])
    })
    test('sets variables in top scope', () => {
      const { frames } = interpret(
        `
        for each num in [1] do
          set foo to "bar"
        end
        log foo
      `,
        {}
      )
      const lastFrame = frames[frames.length - 1]
      expect(lastFrame.status).toBe('SUCCESS')
      expect(lastFrame.variables).toMatchObject({ foo: 'bar' })
    })
    test('iterator does not leak', () => {
      const { frames } = interpret(
        `
        for each num in [1] do
        end
        log num
      `,
        {}
      )
      const lastFrame = frames[frames.length - 1]
      expect(lastFrame.status).toBe('ERROR')
      expect(lastFrame.error).toBeInstanceOf(RuntimeError)
      expect(lastFrame.error?.message).toMatch(/VariableNotDeclared: name: num/)
    })
  })
})
