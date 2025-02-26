import { ExecutionContext } from '@/interpreter/executor'
import * as Jiki from '@/interpreter/jikiObjects'
import { storeShape, changeBrightness } from './Component'

function fn(this: any) {
  const drawDoor = (executionCtx: ExecutionContext, door: Jiki.Instance) => {
    this.fillColorHex(executionCtx, new Jiki.String('#A0512D'))
    this.rectangle(
      executionCtx,
      door.getField('left') as Jiki.Number,
      door.getField('top') as Jiki.Number,
      door.getField('width') as Jiki.Number,
      door.getField('height') as Jiki.Number
    )
    storeShape(this, door)

    this.fillColorHex(executionCtx, new Jiki.String('#FFDF00'))
    this.circle(
      executionCtx,
      //@ts-ignore
      new Jiki.Number(
        door.getField('left').value + door.getField('width').value - 2
      ),
      //@ts-ignore
      new Jiki.Number(
        door.getField('top').value + door.getField('height').value / 2
      ),
      new Jiki.Number(1)
    )
    const knobShape = this.shapes[this.shapes.length - 1]
    knobShape.element.style.filter = 'brightness(100%)'
    knobShape.element.style.zIndex = door.getField('z_index').value.toString()
    door['knobShape'] = knobShape
  }

  const changeDoorBrightness = (
    executionCtx: ExecutionContext,
    door: Jiki.Instance
  ) => {
    const shape = door['knobShape']
    this.addAnimation({
      targets: `#${this.view.id} #${shape.element.id}`,
      duration: 1,
      transformations: {
        filter: `brightness(${door.getUnwrappedField('brightness')}%)`,
      },
      offset: executionCtx.getCurrentTime(),
    })
    changeBrightness(executionCtx, this, door)
    this.events.push(`door:brightness:${door.getUnwrappedField('brightness')}`)
  }

  const Door = new Jiki.Class('Door')
  Door.addConstructor(function (
    this: Jiki.Instance,
    executionCtx: ExecutionContext,
    left: Jiki.Number,
    top: Jiki.Number,
    width: Jiki.Number,
    height: Jiki.Number,
    z_index: Jiki.Number
  ) {
    this.fields['left'] = left
    this.fields['top'] = top
    this.fields['width'] = width
    this.fields['height'] = height
    this.fields['z_index'] = z_index
    drawDoor(executionCtx, this)
  })
  Door.addSetter(
    'brightness',
    function (
      this: Jiki.Instance,
      executionCtx: ExecutionContext,
      brightness: Jiki.Number
    ) {
      this.fields['brightness'] = brightness
      changeDoorBrightness(executionCtx, this)
    }
  )
  return Door
}

export function buildDoor(binder: any) {
  return fn.bind(binder)()
}
